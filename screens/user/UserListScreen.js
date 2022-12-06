"use strict";
import $ from "../../setup";
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from "react-native";
import { Text } from "react-native-paper";
import Header from "../../components/Header";

const UserListScreen = function({navigation, route}) {
  const user_id = route.params.user_id;
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Header title={route.params.title} on_press_back={on_press_back}/>
      <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
        <Text>UserListScreen.js</Text>
      </View>
    </SafeAreaView>
  );
};


export default UserListScreen;