export const fontFamily = {
  regular: 'NunitoSans_400Regular',
  medium: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  black: 'NunitoSans_900Black',
};

export const typography = {
  h1: { fontFamily: fontFamily.black, fontSize: 32, lineHeight: 38 },
  h2: { fontFamily: fontFamily.black, fontSize: 26, lineHeight: 32 },
  h3: { fontFamily: fontFamily.black, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  bodyBold: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fontFamily.bold, fontSize: 12, lineHeight: 16 },
  tiny: { fontFamily: fontFamily.black, fontSize: 10, lineHeight: 13 },
};
