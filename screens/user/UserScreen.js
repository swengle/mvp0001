"use strict";
import $ from "../../setup";
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from "react-native-paper";
import { getAuth, signOut } from "firebase/auth";

const User = function({navigation}) {
  const on_press_logout = async function() {
    const auth = getAuth();
    await signOut(auth);
  };

  return (
    <SafeAreaView style ={{flex: 1, backgroundColor: "white"}} edges={['right', 'top', 'left']}>
      <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Button mode="contained" onPress={on_press_logout}>LOGOUT</Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};




export default User;