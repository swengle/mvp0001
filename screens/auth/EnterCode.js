"use strict";
import $ from "../../setup.js";
import _ from "underscore";
import { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform, KeyboardAvoidingView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { useToast } from "react-native-toast-notifications";
import { Text, useTheme } from 'react-native-paper';
import { getAuth, signInWithCustomToken } from "firebase/auth";
const CELL_COUNT = 5;
import { useSnapshot } from "valtio";

const auth = getAuth();
const functions = getFunctions();
const f_get_auth_token = httpsCallable(functions, 'get_auth_token');

const EnterCode = function({route, navigation}) {
  const snap_auth = useSnapshot($.auth);
  const { colors } = useTheme();
  const [is_busy, set_is_busy] = useState(false);
  const toast = useToast();
  const [value, set_value] = useState('');
  const ref = useBlurOnFulfill({value, cellCount: CELL_COUNT});
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    set_value,
  });
  
  const on_press_not_my_number = function() {
    $.auth.phone_value = "";
    _.delay(function() {
      navigation.goBack();
    }, 100);
  };
  
  
  const on_blur = async function() {
    try {
      set_is_busy(true);
      if (value === $.auth.pin.code) {
        const response = await f_get_auth_token({ phone: $.auth.pin.phone });
        await signInWithCustomToken(auth, response.data.token);
        delete $.auth.pin;
      } else {
        $.auth.pin.attempts_left--;
        if ($.auth.pin.attempts_left === 0) {
          $.display_error(toast, new Error("Invalid code. " + $.auth.pin.attempts_left + " attempt" + ($.auth.pin.attempts_left === 1 ? "" : "s") + " left."));
          delete $.auth.pin;
          navigation.goBack();
        }
      }
    } catch (e) {
      console.log(e);
      $.display_error(toast, new Error("Unable to validate code."));
      set_value("");
    } finally {
      set_is_busy(false);
      ref.current && ref.current.focus();
    }
  };
  
  return (
    <SafeAreaView style ={{flex: 1}}>
      <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <ScrollView keyboardShouldPersistTaps='always' style={{flex: 1}} contentContainerStyle={{padding: 10, flex: 1}} >
          <Text style={{fontSize: 20, marginTop: 10, marginBottom: 10, fontWeight: "bold", textAlign: "center"}}>Enter the code we sent to {snap_auth.phone}</Text>
          <View style={{marginLeft: 40, marginRight: 40}}>
            <CodeField
              autoFocus={true}
              onBlur={on_blur}
              ref={ref}
              {...props}
              // Use `caretHidden={false}` when users can't paste a text value, because context menu doesn't appear
              value={value}
              onChangeText={set_value}
              cellCount={CELL_COUNT}
              rootStyle={styles.codeFieldRoot}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              renderCell={({index, symbol, isFocused}) => (
                <Text
                  key={index}
                  style={[styles.cell, isFocused && {borderColor: colors.text}]}
                  onLayout={getCellOnLayoutHandler(index)}>
                  {symbol || (isFocused ? <Cursor /> : null)}
                </Text>
              )}
            />
          </View>
          <View style={{flex: 1, alignItems: "center", justifyContent: "flex-end"}}>
            <TouchableOpacity onPress={on_press_not_my_number}>
                <Text style={{color: "gray", fontWeight: "bold", fontSize: 15}}>This isn't my phone number</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, padding: 20},
  title: {textAlign: 'center', fontSize: 30},
  codeFieldRoot: {marginTop: 20},
  cell: {
    width: 40,
    height: 40,
    lineHeight: 38,
    fontSize: 24,
    borderWidth: 2,
    borderColor: 'lightgray',
    textAlign: 'center',
  }
});

export default EnterCode;
