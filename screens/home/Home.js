"use strict";
import $ from "../../setup";
import _ from "underscore";
import { StatusBar } from 'expo-status-bar';
import { useState} from "react";
import { Image, ScrollView, Text, View, useWindowDimensions } from 'react-native';

const HomeScreen = function() {
  const { height, width } = useWindowDimensions();

  return (
    <View style ={{flex: 1}}>
      <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
        <Text>Home</Text>
      </View>
    </View>
  );
};

// <Image style={{width: width, height: height}} source={require("./test_image.jpg")}/>

export default HomeScreen;
