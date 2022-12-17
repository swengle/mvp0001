"use strict";
import { useState } from "react";
import { Pressable } from "react-native";

const ToucableOpacity = function({style, onPress, children}) {
  const [opacity, set_opacity] = useState(1);
  
  const on_press_in = function() {
    set_opacity(0.7);
  };
  
  const on_press_out = function() {
    set_opacity(1);
  };
  
  return (
    <Pressable onPressIn={on_press_in} onPressOut={on_press_out} style={[style, {opacity: opacity}]} onPress={onPress}>
      {children}
    </Pressable>
  );
};


export default ToucableOpacity;