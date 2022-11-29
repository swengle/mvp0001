"use strict";
import { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { useTheme } from 'react-native-paper';

const IconTextInput = function({style, icon, placeholder, is_auto_focus, keyboard_type, on_change_text}) {
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [isHasFocus, setIsHasFocus] = useState();
  const [isTextValid, setIsTextValid] = useState(false);
  
  const on_change_text_inner = function(text) {
    setText(text);
    if (text.trim().length > 0) {
      setIsTextValid(true);
    } else {
      setIsTextValid(false);
    }
    on_change_text && on_change_text(text);
  };
  
  const on_focus = function() {
    setIsHasFocus(true);
  };
  
  const on_blur = function() {
    setIsHasFocus(false);
  };
  
  const on_press_clear = function() {
    setText("");
    on_change_text_inner && on_change_text_inner("");
  };
  
  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={20} color="gray" style={{marginRight: 4}}/>
      <TextInput
        style={[{flex: 1, color: colors.text}]}
        placeholder={placeholder || "Enter text"}
        onChangeText={on_change_text_inner}
        onFocus={on_focus}
        onBlur={on_blur}
        autoCompleteType="off"
        autoCapitalize="none"
        autoCorrect={false}
        value={text}
        autoFocus={is_auto_focus}
        keyboardType={keyboard_type}
        placeholderTextColor="gray"
      />
      {isHasFocus && isTextValid && (
        <TouchableOpacity onPress={on_press_clear}>
          <Ionicons name="close-circle" size={22} color="gray" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row", 
    justifyContent: "center", 
    borderColor: "gray", 
    padding: 8,
    alignItems: "center",
    height: 40
  }
});


export default IconTextInput;