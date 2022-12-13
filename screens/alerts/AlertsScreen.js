"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect ,useRef, useState } from "react";
import { FlatList, SectionList, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmojiSelector from "../../components/EmojiSelector";
import * as MediaLibrary from 'expo-media-library';


const AlertsScreen = function() {
  const { height, width, scale, fontScale } = useWindowDimensions();
  
  
  /*
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  
  console.log(permissionResponse);
  
  useEffect(() => {
    const request_permission = async () => {
      const foo = await requestPermission();
      console.log(foo);
      const albums = await MediaLibrary.getAlbumsAsync();
      console.log(albums);
    };
    
    request_permission();
  }, []);
  */

  return (
    <SafeAreaView style ={{flex: 1}} edges={'top'}>
      <EmojiSelector/>
    </SafeAreaView>
  );
};


export default AlertsScreen;