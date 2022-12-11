"use strict";
import { Text } from "react-native-paper";

const ListEmpty = function({ text, data }) {
  if (!data) {
    return null;
  }
  return (
    <Text variant="titleSmall" style={{textAlign: "center", marginTop: 40}}>{text}</Text>   
  );
};


export default ListEmpty;