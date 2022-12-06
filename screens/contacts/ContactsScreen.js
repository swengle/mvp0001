"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useState } from "react";
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, HelperText } from "react-native-paper";
import Header from "../../components/Header";
import * as Contacts from 'expo-contacts';
import { useToast } from "react-native-toast-notifications";

const ContactsScreen = function({navigation}) {
  const toast = useToast();
  const [contacts, setContacts] = useState();
  const [isError, setIsError] = useState();
  const [isBusy, setIsBusy] = useState(true);
  const [isDoRetry, setIsDoRetry] = useState(true);
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  useEffect(() => {
    if (isDoRetry) {
      setIsDoRetry(false);
      
      const fetch_contacts = async function() {
        const contacts = await Contacts.getContactsAsync({fields: [Contacts.Fields.PhoneNumbers]});
        const output = [];
        _.each(contacts.data, function(contact) {
          output.push(_.pick(contact, "name", "phoneNumbers"));
        });
        try {
          setIsBusy(true);
          const data = (await $.axios_api.post("/users/from-contacts", {contacts: output})).data;
          console.log(data);
          setContacts([]);
        } catch (e) {
          $.display_error(toast, e);
          setIsError(true);
        } finally {
          setIsBusy(false);
        }
      };
      
      fetch_contacts();
    }
  }, [isDoRetry]);
  
  
  const on_press_retry = function() {
    setIsError(false);
    setIsDoRetry(true);
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
    <Header on_press_back={on_press_back} title="Contacts"/>
     <ScrollView style={{ flex: 1 }} contentContainerStyle={{flexGrow: 1}}>
      {!isError && isBusy && (
        <View style={{flex:1, alignItems: "center", justifyContent: "center"}}>
          <ActivityIndicator animating={true}/>
        </View>
      )}
      {isError && (
        <View style={{flex:1, alignItems: "center", justifyContent: "center"}}>
          <Button mode="contained" onPress={on_press_retry}>Retry</Button>
          <HelperText type="error">Something went wrong!</HelperText>
        </View>
      )}
     </ScrollView>
    </SafeAreaView>
  );
};


export default ContactsScreen;