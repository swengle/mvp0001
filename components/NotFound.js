"use strict";
import { View } from "react-native";
import { Appbar, Text } from "react-native-paper";
import { SafeAreaView } from 'react-native-safe-area-context';

const NotFound = function({ edges, on_press_back }) {
  return (
    <SafeAreaView style ={{flex: 1}} edges={edges || ["top", "right", "left"]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title={"Oops"}  />
      </Appbar.Header>
      
      <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
        <Text variant="titleSmall">NOT FOUND!</Text>
      </View>
    </SafeAreaView>
  );
};


export default NotFound;