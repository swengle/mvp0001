"use strict";
import $ from "../../setup";
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from "../../components/Header";
import { Keyboard, TouchableOpacity, Text } from 'react-native';
import EmojiSelector from "../../components/EmojiSelector";
import { useSnapshot } from "valtio";

const SelectEmojiScreen = function({ navigation }) {
  const snap_editor = useSnapshot($.editor);
  
  const on_press_back = function() {
    navigation.goBack();
  };   
  
  const on_emoji_select = function(emoji) {
    Keyboard.dismiss();
    $.editor.emoji = emoji;
    navigation.push("DetailsScreen");
  };
  
  const on_press_forward = function() {
    Keyboard.dismiss();
    navigation.push("DetailsScreen");
  };

  return (
    <SafeAreaView style ={{flex: 1}}>
      <Header title="What's your mood?" on_press_back={on_press_back} right={
        snap_editor.emoji ? <TouchableOpacity onPress={on_press_forward} style={{paddingRight: 10}}><Text style={{ fontFamily: "TwemojiMozilla", fontSize: 42, width: 42}}>{snap_editor.emoji.base}</Text></TouchableOpacity> : null
      }/>
      <EmojiSelector onSelect={on_emoji_select}/>
    </SafeAreaView>
  );
};

export default SelectEmojiScreen;