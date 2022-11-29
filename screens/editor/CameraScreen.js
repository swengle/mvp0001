"use strict";
import $ from "../../setup.js";
import _ from "underscore";
import { useEffect, useRef, useState } from "react";
import { View, useWindowDimensions } from 'react-native';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import { IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { proxy } from 'valtio';

const CameraScreen = function({ navigation }) {
  const {width} = useWindowDimensions();
  const ref_camera = useRef();
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [flashMode, setFlashMode] = useState(FlashMode.off);
  
  useEffect(() => {
    $.editor = proxy({});
  }, []);

  const on_press_close = function() {
    navigation.goBack();
  };

  let flash_icon, type_icon;

  if (flashMode === FlashMode.on) {
    flash_icon = "flash";
  } else if (flashMode === FlashMode.off) {
    flash_icon = "flash-off";
  } else if (flashMode === FlashMode.auto) {
    flash_icon = "flash-auto";
  }
  
  if (cameraType === CameraType.back) {
    type_icon = "camera-rear";
  } else if (CameraType.front) {
    type_icon = "camera-front";
  }
  
  const on_press_flash = function() {
    if (flash_icon === "flash-off") {
      setFlashMode(FlashMode.auto);
      flash_icon = "flash-auto";
    } else if (flash_icon === "flash") {
      setFlashMode(FlashMode.off);
      flash_icon = "flash-off";
    } else {
      setFlashMode(FlashMode.on);
      flash_icon = "flash";
    }
  };
  
  const on_press_type = function() {
    if (type_icon === "camera-rear") {
      setCameraType(CameraType.front);
      type_icon = "camera-front";
    } else {
      setCameraType(CameraType.back);
      type_icon = "camera-rear";
    }
  };
  
  const on_press_take_picture = async function() {
    const pic = await ref_camera.current.takePictureAsync({quality: 1});
    $.editor.pic = _.extend({source: "camera"}, pic);
    navigation.push("SelectEmojiScreen");
  };
  
  const on_press_pick_image = async function() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All
    });
    if (!result.canceled) {
      $.editor.pic = _.extend({source: "camera"}, _.extend({source: "picker"}, _.first(result.assets)));
      navigation.push("SelectEmojiScreen");
    }
  };

  const camera_height =(width * 1.25);

  return (
    <SafeAreaView style ={{flex: 1}}>
      <View style={{flexDirection: "row", paddingBottom: 20}}>
        <IconButton icon="close" mode="contained" onPress={on_press_close}/>
        <View style={{flexDirection: "row", flex: 1, justifyContent: "flex-end"}}>
          <IconButton icon="image-multiple-outline" mode="contained" onPress={on_press_pick_image}/>
          <IconButton icon={flash_icon} mode="contained" onPress={on_press_flash}/>
          <IconButton icon={type_icon} mode="contained" onPress={on_press_type}/>
        </View>
      </View>
      <Camera
        ref={ref_camera}
        type={cameraType}
        flashMode={flashMode}
        style={{height: camera_height}}
      />
      <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
        <IconButton icon="circle" mode="contained" onPress={on_press_take_picture} size={64}/>
      </View>
    </SafeAreaView>
  );
};


export default CameraScreen;
