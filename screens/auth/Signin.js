"use strict";

import $ from "../../setup.js";
$.env = "alpha";
import { useEffect,useRef, useState } from "react";
import { Platform, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSnapshot } from 'valtio';
import { subscribeKey } from 'valtio/utils';
import { PhoneNumberType, PhoneNumberUtil } from 'google-libphonenumber';
import Flag from "../../components/Flag";
import { Button, Text, TextInput } from 'react-native-paper';
import { useToast } from "react-native-toast-notifications";

const phone_util = PhoneNumberUtil.getInstance();

const on_press_privacy_policy = async function() {
  let env = '';
  if ($.env === 'alpha') {
    env = 'alpha.';
  }
  else if ($.env === 'beta') {
    env = 'beta.';
  }
  const privacy_url = 'https://' + env + 'purzona.com/privacy.html';
  await WebBrowser.openBrowserAsync(privacy_url);
};

const on_press_terms_of_service = async function() {
    let env = '';
    if ($.env === 'alpha') {
      env = 'alpha.';
    }
    else if ($.env === 'beta') {
      env = 'beta.';
    }
    const terms_url = 'https://' + env + 'purzona.com/terms.html';
    await WebBrowser.openBrowserAsync(terms_url);
};

const check_if_phone_is_valid = function() {
  const calling_code = $.data.countries_by_cca2[$.auth.cca2].calling_code;
  
  let number;
  let is_possible_number = true;
  try {
    number = phone_util.parse(calling_code + $.auth.phone_value, $.auth.cca2);
  }
  catch (e) {
    is_possible_number = false;
  }
  
  let is_valid_phone = false;
  if (is_possible_number) {
    is_valid_phone = phone_util.isValidNumberForRegion(number, $.auth.cca2);
    if (is_valid_phone) {
      const phone_type = phone_util.getNumberType(number);
      if (phone_type !== PhoneNumberType.MOBILE && phone_type !== PhoneNumberType.FIXED_LINE_OR_MOBILE) {
        is_valid_phone = false;
      }
    }
  }
  $.auth.is_phone_valid = is_valid_phone;
};

const on_change_text_phone = function(value) {
  $.auth.phone_value = value.trim();
  check_if_phone_is_valid();
};


function ScreenSignin({ navigation }) {
  const toast = useToast();
  
  const [isBusy, setIsBusy] = useState(false);
  const auth_state = useSnapshot($.auth);
  const ref_input = useRef();
  let unsubscribe, unsubscribe2;
  
  useEffect(() => {
    unsubscribe = subscribeKey($.auth, "cca2", (v) =>
      check_if_phone_is_valid()
    );
    unsubscribe2 = navigation.addListener('focus', () => {
      check_if_phone_is_valid();
      ref_input.current.focus();
    });
  }, []);
  
  useEffect(() => {
    return () => {
      unsubscribe && unsubscribe();
      unsubscribe2 && unsubscribe2();
    };
  }, []);
  
  const on_press_flag = function() {
    navigation.push("SelectCountryScreen");
  };
  
  const on_press_continue = async function() {
    const calling_code = $.data.countries_by_cca2[$.auth.cca2].calling_code;
    const phone = calling_code + $.auth.phone_value;
    
    try {
      setIsBusy(true);
      await $.axios_api.post('/auth_codes', {device_id: $.app.device_id, phone: phone, phone_value: $.auth.phone_value});
      navigation.push("EnterCodeScreen", {phone: phone});
    } catch (e) {
      $.display_error(toast, e);
    } finally {
      setIsBusy(false);
    }
  };
  
  return (
      <SafeAreaView style ={{flex: 1}} edges={['top', 'right', 'left']}>
        <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
          <ScrollView keyboardShouldPersistTaps='always' style={{flex: 1}} contentContainerStyle={{padding: 8, flex: 1}} >
            <View style={{alignItems: "center"}}>
                <Text style={{fontSize: 20, marginTop: 10, marginBottom: 10, fontWeight: "bold"}}>Enter your phone number to continue</Text>
                <View style={{flexDirection: "row", alignItems: "center"}}>
                  <Button mode="outlined" onPress={on_press_flag} style={{marginRight: 4}}>
                      <Text style={{fontWeight: "bold"}}>
                        <Flag style={{fontFamily: "TwemojiMozilla"}} countryCode={auth_state.cca2}/>
                        {$.data.countries_by_cca2[auth_state.cca2].calling_code}
                      </Text>
                  </Button>
                  <TextInput
                    label={<Text style={{color: "gray", fontSize: 16}}>Phone</Text>}
                    ref={ref_input}
                    autoFocus={true}
                    style={styles.input}
                    underlineColorAndroid="transparent"
                    autoCapitalize="none"
                    keyboardType="phone-pad"
                    value={auth_state.phone_value}
                    onChangeText={on_change_text_phone}
                  />
                </View>
            </View>
              
            <View style={{flex:1, justifyContent: "flex-end"}}>
              <Text style={{marginBottom: 6, textAlign: "center"}}>
                By tapping "Continue", you agree to our <Text onPress={on_press_privacy_policy} style={{fontWeight: "bold"}}>Privacy Policy</Text> and <Text onPress={on_press_terms_of_service} style={{fontWeight: "bold"}}>Terms of Service</Text>.
              </Text>
              <Button onPress={on_press_continue} disabled={!auth_state.is_phone_valid || isBusy} onPress={on_press_continue} mode="contained">
                  Continue
              </Button>
            </View>
              
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

export default ScreenSignin;

const styles = StyleSheet.create({
  input: {
    flex: 1,
    overflow: 'hidden',
    fontSize: 24,
    fontWeight: "bold"
  }
});