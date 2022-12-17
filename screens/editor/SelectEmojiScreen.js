"use strict";
import $ from "../../setup";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Keyboard, Text } from 'react-native';
import TouchableOpacity  from "../../components/TouchableOpacity";
import EmojiSelector from "../../components/EmojiSelector";
import { useSnapshot } from "valtio";
import { Appbar } from "react-native-paper";

const SelectEmojiScreen = function({ navigation }) {
  const snap_editor = useSnapshot($.editor);
  
  const on_press_back = function() {
    navigation.goBack();
  };   
  
  const on_emoji_select = function(emoji_data) {
    Keyboard.dismiss();
    $.editor.emoji = emoji_data;
    navigation.push("DetailsScreen");
  };
  
  const on_press_forward = function() {
    Keyboard.dismiss();
    navigation.push("DetailsScreen");
  };

  return (
    <SafeAreaView style ={{flex: 1}}>
      <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title="What's your mood?" />
        {snap_editor.emoji && <TouchableOpacity onPress={on_press_forward} style={{paddingRight: 10}}><Text style={{ fontFamily: "TwemojiMozilla", fontSize: 42, width: 42}}>{snap_editor.emoji.base}</Text></TouchableOpacity>}
      </Appbar.Header>
      <EmojiSelector onSelect={on_emoji_select}/>
    </SafeAreaView>
  );
};

export default SelectEmojiScreen;