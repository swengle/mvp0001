"use strict";

import $ from "../../setup.js";
$.env = "alpha";
import _ from "underscore";
import { useEffect, useRef } from "react";
import { Platform, KeyboardAvoidingView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSnapshot } from 'valtio';
import { subscribeKey } from 'valtio/utils';
import { PhoneNumberType, PhoneNumberUtil } from 'google-libphonenumber';
import { Button, Text, TextInput } from 'react-native-paper';
import firestore from "../../firestore/firestore";

const pad = function(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

const phone_util = PhoneNumberUtil.getInstance();

const offset = 127397;

$.countries = require("./countries.json");
$.countries_by_cca2 = {};
_.each($.countries, function(country, idx) {
  $.countries_by_cca2[country.cca2] = country;
});

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
  const calling_code = $.countries_by_cca2[$.auth.cca2].calling_code;
  
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
  const snap_auth = useSnapshot($.auth);
  const ref_input = useRef();

  useEffect(() => {
    const unsubscribe = subscribeKey($.auth, "cca2", (v) =>
      check_if_phone_is_valid()
    );
    const unsubscribe2 = navigation.addListener('focus', () => {
      check_if_phone_is_valid();
      ref_input.current.focus();
    });
    
    return function() {
      unsubscribe();
      unsubscribe2();
    };
    
  }, []);

  const on_press_flag = async function() {
    await firestore.test();
    //navigation.push("SelectCountryScreen");
  };
  
  const on_press_continue = async function() {
    const calling_code = $.countries_by_cca2[$.auth.cca2].calling_code;
    const phone = calling_code + $.auth.phone_value;
    
    $.auth.pin = {
      phone: phone,
      created_at: Date.now(),
      code: pad(_.random(99999), 5),
      attempts_left: 5
    };
    
    console.log("TODO: send sms to :" + phone + ", with code: " + $.auth.pin.code);
    navigation.push("EnterCodeScreen");
  };
  
  const cc = snap_auth.cca2.toUpperCase();
  const flag_character = /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => c.charCodeAt() + offset)) : null;
  
  return (
      <SafeAreaView style ={{flex: 1}} edges={['top', 'right', 'left']}>
        <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
          <ScrollView keyboardShouldPersistTaps='always' style={{flex: 1}} contentContainerStyle={{padding: 8, flex: 1}} >
            <View style={{alignItems: "center"}}>
                <Text style={{fontSize: 20, marginTop: 10, marginBottom: 10, fontWeight: "bold"}}>Enter your phone number to continue</Text>
                <View style={{flexDirection: "row", alignItems: "center"}}>
                  <TouchableOpacity mode="outlined" onPress={on_press_flag} style={{marginRight: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4, borderRadius: 10}}>
                    <Text style={{fontFamily: "TwemojiMozilla", fontSize: 48}}>{flag_character}</Text>
                    <Text style={{fontWeight: "bold", fontSize: 20}}> {$.countries_by_cca2[snap_auth.cca2].calling_code}</Text>
                  </TouchableOpacity>
                  <TextInput
                    label={<Text style={{color: "gray", fontSize: 16}}>Phone</Text>}
                    ref={ref_input}
                    autoFocus={true}
                    style={styles.input}
                    underlineColorAndroid="transparent"
                    autoCapitalize="none"
                    keyboardType="phone-pad"
                    value={snap_auth.phone_value}
                    onChangeText={on_change_text_phone}
                  />
                </View>
            </View>
              
            <View style={{flex:1, justifyContent: "flex-end"}}>
              <Text style={{marginBottom: 6, textAlign: "center"}}>
                By tapping "Continue", you agree to our <Text onPress={on_press_privacy_policy} style={{fontWeight: "bold"}}>Privacy Policy</Text> and <Text onPress={on_press_terms_of_service} style={{fontWeight: "bold"}}>Terms of Service</Text>.
              </Text>
              <Button onPress={on_press_continue} disabled={!snap_auth.is_phone_valid} onPress={on_press_continue} mode="contained">
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