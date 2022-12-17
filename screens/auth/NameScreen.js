"use strict";

import $ from "../../setup.js";
import _ from "underscore";
import { useState } from "react";
import { Platform, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, TextInput } from 'react-native-paper';
import { useToast } from "react-native-toast-notifications";
import firestore from "../../firestore/firestore";

const user_name_regex = /^[a-zA-Z0-9_][a-zA-Z0-9_.]*/;

function ScreenName({ navigation }) {
  const toast = useToast();
  const [usernameValue, setUsernameValue] = useState("");
  const [nameValue, setNameValue] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [isNameValid, setIsNameValid] = useState(true);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(false);
  
  const check_if_valid_username = _.debounce(async function(val) {
    try {
      setIsUsernameValid(true);
      setIsBusy(true);
      setIsUsernameAvailable(await firestore.is_username_available({username: val}));
    } catch (e) {
      $.logger.error(e);
      $.display_error(toast, new Error("Unable to check username."));
    } finally {
      setIsBusy(false);
    }
  }, 300, false);
  
  const on_change_text_username = async function(value) {
    setUsernameValue(value);
    setIsUsernameValid(false);
    const val = value.trim();
    if (val.length > 0 && val.length < 65 && user_name_regex.test(val)) {
      await check_if_valid_username(val);
    }
  };
  
  _.debounce(on_change_text_username, 300, false);
  
  const on_change_text_name = function(value) {
    setNameValue(value);
    const val = value.trim();
    if (val.length > 65) {
      setIsNameValid(false);
    } else {
      setIsNameValid(true);
    }
  };

  
  const on_press_continue = async function() {
    const username = usernameValue.trim();
    const name = nameValue.trim();
    try {
      setIsBusy(true);
      await firestore.update_user({id: $.session.uid, username: username, name: name});
    } catch (e) {
      $.logger.error(e);
      $.display_error(toast, new Error("Failed to update username."));
    } finally {
      setIsBusy(false);
    }
  };
  
  return (
      <SafeAreaView style ={{flex: 1}} edges={['top', 'right', 'left']}>
        <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
          <ScrollView keyboardShouldPersistTaps='always' style={{flex: 1}} contentContainerStyle={{padding: 10, flex: 1}} >
              <TextInput
                label={<Text style={{color: "gray", fontSize: 16}}>Username</Text>}
                autoFocus={true}
                style={[{marginBottom: 10}, styles.input]}
                underlineColorAndroid="transparent"
                autoCapitalize="none"
                onChangeText={on_change_text_username}
                maxLength={64}
                autoCorrect={false}
                value={usernameValue}
              />
              
              <TextInput
                label={<Text style={{color: "gray", fontSize: 16}}>Name (optional)</Text>}
                autoFocus={false}
                style={styles.input_name}
                underlineColorAndroid="transparent"
                autoCapitalize="none"
                onChangeText={on_change_text_name}
                maxLength={64}
                value={nameValue}
              />
              
            <View style={{flex:1, justifyContent: "flex-end"}}>
              <Button onPress={on_press_continue} disabled={!isNameValid || !isUsernameValid || !isUsernameAvailable || isBusy} onPress={on_press_continue} mode="contained">
                  {!isUsernameAvailable ? "USERNAME NOT AVAILABLE" : !isNameValid ? "INVALID NAME" : "CONTINUE"}
              </Button>
            </View>
              
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

export default ScreenName;

const styles = StyleSheet.create({
  input: {
    flex: 0,
    overflow: "hidden",
    fontSize: 20,
    fontWeight: "bold"
  },
  input_name: {
    flex: 0,
    overflow: "hidden",
    fontSize: 18,
    fontWeight: "bold"
  }
});