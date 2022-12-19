"use strict";
import { View } from "react-native";
import { Text } from "react-native-paper";

const NotFound = function({  }) {
  return (
    <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
      <Text variant="titleSmall">NOT FOUND</Text>
    </View>
  );
};


export default NotFound;