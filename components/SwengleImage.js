"use strict";
import { useState } from "react";
import { Image, View } from 'react-native';
import { ActivityIndicator, useTheme } from "react-native-paper";

const SwengleImage = function(props) {
  const { colors } = useTheme();
  const [is_loaded, set_is_loaded] = useState(false);
  
  const on_load_end = function() {
    set_is_loaded(true);  
  };
  
  return (
    <View style={{backgroundColor: colors.outline, alignItems: "center",justifyContent: "center"}}>
      <Image {...props} onLoadEnd={on_load_end}/>
      {!is_loaded && <ActivityIndicator style={{position: "absolute"}}/>}
    </View>    
  );
};


export default SwengleImage;