const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const DOH_DEPENDENCY =
  'implementation("com.squareup.okhttp3:okhttp-dnsoverhttps:4.9.2")';

function withAndroidDnsFallback(config) {
  config = withAppBuildGradle(config, (configWithGradle) => {
    if (configWithGradle.modResults.language !== 'groovy') {
      throw new Error('CGH DNS fallback currently requires a Groovy app/build.gradle.');
    }

    let contents = configWithGradle.modResults.contents;
    if (!contents.includes('okhttp-dnsoverhttps')) {
      contents = contents.replace(
        /dependencies\s*\{\s*\n/,
        (match) => `${match}    ${DOH_DEPENDENCY}\n`,
      );
    }
    if (!contents.includes('okhttp-dnsoverhttps')) {
      throw new Error('Unable to add the Android DNS-over-HTTPS dependency.');
    }
    configWithGradle.modResults.contents = contents;
    return configWithGradle;
  });

  return withDangerousMod(config, [
    'android',
    async (configWithAndroid) => {
      const packageName = configWithAndroid.android?.package;
      if (!packageName) throw new Error('Android package name is required for DNS fallback.');

      const javaRoot = path.join(
        configWithAndroid.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        ...packageName.split('.'),
      );
      fs.mkdirSync(javaRoot, { recursive: true });
      fs.writeFileSync(
        path.join(javaRoot, 'CghNetwork.kt'),
        nativeSource(packageName),
      );

      const mainApplicationPath = path.join(javaRoot, 'MainApplication.kt');
      let mainApplication = fs.readFileSync(mainApplicationPath, 'utf8');
      if (!mainApplication.includes('CghNetwork.install(applicationContext)')) {
        mainApplication = mainApplication.replace(
          /super\.onCreate\(\)\s*\n/,
          (match) => `${match}    CghNetwork.install(applicationContext)\n`,
        );
      }
      if (!mainApplication.includes('CghNetwork.install(applicationContext)')) {
        throw new Error('Unable to install the Android DNS fallback during app startup.');
      }
      fs.writeFileSync(mainApplicationPath, mainApplication);
      return configWithAndroid;
    },
  ]);
}

function nativeSource(packageName) {
  return `package ${packageName}

import android.content.Context
import com.facebook.react.modules.network.OkHttpClientProvider
import java.net.InetAddress
import java.net.UnknownHostException
import okhttp3.Dns
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.dnsoverhttps.DnsOverHttps

/**
 * Keeps portal traffic direct while bypassing broken ISP DNS resolvers.
 *
 * The official portal uses encrypted DNS first because some networks return an
 * unusable answer instead of throwing. Other hosts use Android DNS first and
 * only fall back to encrypted DNS when normal resolution fails.
 */
object CghNetwork {
  private const val PORTAL_HOST = "automate.cghc.edu.ph"

  fun install(context: Context) {
    val bootstrapClient =
      OkHttpClientProvider.createClientBuilder(context)
        .dns(Dns.SYSTEM)
        .build()

    val encryptedDns =
      DnsOverHttps.Builder()
        .client(bootstrapClient)
        .url("https://cloudflare-dns.com/dns-query".toHttpUrl())
        .bootstrapDnsHosts(
          InetAddress.getByAddress(byteArrayOf(1, 1, 1, 1)),
          InetAddress.getByAddress(byteArrayOf(1, 0, 0, 1)),
        )
        .includeIPv6(false)
        .post(true)
        .build()

    val resilientDns =
      object : Dns {
        override fun lookup(hostname: String): List<InetAddress> {
          return if (hostname.equals(PORTAL_HOST, ignoreCase = true)) {
            lookupWithFallback(encryptedDns, Dns.SYSTEM, hostname)
          } else {
            lookupWithFallback(Dns.SYSTEM, encryptedDns, hostname)
          }
        }
      }

    OkHttpClientProvider.setOkHttpClientFactory {
      OkHttpClientProvider.createClientBuilder(context)
        .dns(resilientDns)
        .build()
    }
  }

  private fun lookupWithFallback(primary: Dns, fallback: Dns, hostname: String): List<InetAddress> {
    return try {
      primary.lookup(hostname)
    } catch (primaryError: UnknownHostException) {
      try {
        fallback.lookup(hostname)
      } catch (fallbackError: UnknownHostException) {
        fallbackError.addSuppressed(primaryError)
        throw fallbackError
      }
    }
  }
}
`;
}

module.exports = withAndroidDnsFallback;
