import { Text } from "react-native";

const CountryFlag = function({countryCode, style}) {
  const country_code = countryCode ? countryCode : "????";
  const offset = 127397;
  if (typeof countryCode !== "string") {
    throw new TypeError("argument must be a string");
  }
  const cc = country_code.toUpperCase();
  const flag_character = /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => c.charCodeAt() + offset)) : null;

  return (
    <Text style={style}>{flag_character}</Text>
  );
};

export default CountryFlag;

