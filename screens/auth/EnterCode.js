"use strict";
import $ from "../../setup.js";
import _ from "underscore";
import { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform, KeyboardAvoidingView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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
const auth = getAuth();

const EnterCode = function({route, navigation}) {
  const { colors } = useTheme();
  const [isBusy, setIsBusy] = useState(false);
  const toast = useToast();
  const { phone, phone_value } = route.params;
  const [value, setValue] = useState('');
  const ref = useBlurOnFulfill({value, cellCount: CELL_COUNT});
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });
  
  const on_press_not_my_number = function() {
    $.auth.phone_value = "";
    _.delay(function() {
      navigation.goBack();
    }, 100);
  };
  
  
  const on_blur = async function() {
    try {
      setIsBusy(true);
      const data = (await $.axios_api.post("/auth_codes/validate", {device_id: $.app.device_id, phone: phone, auth_code: value})).data;
      await signInWithCustomToken(auth, data.token);
    } catch (e) {
      $.display_error(toast, e);
      if (e.status === 404) {
        navigation.goBack();
      }
      setValue("");
    } finally {
      setIsBusy(false);
      ref.current && ref.current.focus();
    }
  };
  
  return (
    <SafeAreaView style ={{flex: 1}}>
      <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <ScrollView keyboardShouldPersistTaps='always' style={{flex: 1}} contentContainerStyle={{padding: 10, flex: 1}} >
          <Text style={{fontSize: 20, marginTop: 10, marginBottom: 10, fontWeight: "bold", textAlign: "center"}}>Enter the code we sent to {phone}</Text>
          <View style={{marginLeft: 40, marginRight: 40}}>
            <CodeField
              autoFocus={true}
              onBlur={on_blur}
              ref={ref}
              {...props}
              // Use `caretHidden={false}` when users can't paste a text value, because context menu doesn't appear
              value={value}
              onChangeText={setValue}
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
