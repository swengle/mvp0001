"use strict";
import { useState } from "react";
import { Image, View } from 'react-native';
import { ActivityIndicator, useTheme } from "react-native-paper";

const SwengleImage = function({source, style}) {
  const { colors } = useTheme();
  const [is_loaded, set_is_loaded] = useState(false);
  
  const on_load_end = function() {
    set_is_loaded(true);  
  };
  
  const on_load_start = function() {
    set_is_loaded(false);
  };
  
  return (
    <View style={{backgroundColor: colors.surfaceDisabled, alignItems: "center",justifyContent: "center"}}>
      <Image source={source} style={[style, {opacity: is_loaded ? 1 : 0}]} onLoadEnd={on_load_end} onLoadStart={on_load_start}/>
      {!is_loaded && <ActivityIndicator style={{position: "absolute"}}/>}
    </View>    
  );
};


export default SwengleImage;