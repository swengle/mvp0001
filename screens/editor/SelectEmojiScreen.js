"use strict";
import $ from "../../setup";
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from "../../components/Header";
import { Platform, KeyboardAvoidingView } from 'react-native';
import EmojiPicker from 'react-native-emoji-picker-staltz';

const SelectEmojiScreen = function({ navigation }) {
  const on_press_back = function() {
    navigation.goBack();
  };   

  return (
    <SafeAreaView style ={{flex: 1}}>
      <Header title="Select Emoji" on_press_back={on_press_back}/>
      <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <EmojiPicker/>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SelectEmojiScreen;