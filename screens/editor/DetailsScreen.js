"use strict";
import $ from "../../setup.js";
import { useEffect } from "react";
import { Image, ScrollView, useWindowDimensions } from 'react-native';
import { IconButton } from "react-native-paper";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSnapshot } from "valtio";


const DetailsScreen = function({navigation, route}) {
  const state_editor = useSnapshot($.editor);
  const { width } = useWindowDimensions();
  //console.log(state_editor);
  
 useEffect(() => {
    navigation.navigate("SelectEmojiScreen");
  }, []);
  
  const on_press_back = function() {
    navigation.goBack();
  };
  

  const w = width-20;
  const h = w * 1.25;
  
  return (
    <SafeAreaView style ={{flex: 1}}>
      <IconButton icon={"chevron-left"} mode="contained" onPress={on_press_back}/>
      <ScrollView style={{ flex: 1}} contentContainerStyle={{flex: 1, padding: 10, alignItems: "center"}}>
        <Image source={{ uri: state_editor.pic.uri }} style={{ width: w, height: h, borderRadius: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};


export default DetailsScreen;