"use strict";
import { Text } from "react-native-paper";

const ListEmpty = function({ text, is_refreshing }) {
  if (is_refreshing) {
    return null;
  }
  return (
    <Text variant="titleSmall" style={{textAlign: "center", marginTop: 40, marginLeft: 10, marginRight: 10}}>{text}</Text>   
  );
};


export default ListEmpty;