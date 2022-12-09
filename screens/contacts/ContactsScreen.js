"use strict";
import $ from "../../setup";
import _ from "underscore";
import { Fragment, useEffect, useState } from "react";
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, HelperText, Text } from "react-native-paper";
import Header from "../../components/Header";
import * as Contacts from 'expo-contacts';
import { useToast } from "react-native-toast-notifications";
import UserRow from "../../components/UserRow";


const Row = function({navigation, row, contacts, onRefreshNeeded}) {
  if (row.item.is_users_header) {
    return <Fragment><Text style={{margin: 10, marginTop: 20}} variant="titleSmall">YOUR CONTACTS ON SWENGLE</Text></Fragment>;
  } else if (row.item.is_contacts_header) {
    return <Fragment><Text style={{margin: 10, marginTop: (contacts.user_count > 0) ? 50 : 20}} variant="titleSmall">INVITE CONTACTS</Text></Fragment>;
  }
  return <UserRow navigation={navigation} user_id={row.item.user ? row.item.user.id : null} contact={row.item} onRefreshNeeded={onRefreshNeeded}/>;
};

const ContactsScreen = function({navigation}) {
  const toast = useToast();
  const [extra_data, set_extra_data] = useState(new Date());
  const [contacts, set_contacts] = useState();
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
          const response = (await $.axios_api.post("/users/from-contacts", {contacts: output})).data;
          
          for (let i=0; i<response.user_count; i++) {
            $.cache.set_user(response.data[i].user);
          }
          
          let now = Date.now();
          response.data.splice(0, 0, {
            id: now,
            is_users_header: true
          });
          response.data.splice(response.user_count+1, 0, {
            id: ++now,
            is_contacts_header: true
          });
          set_contacts(response);
        } catch (e) {
          $.display_error(toast, new Error("Failed to process contacts."));
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
  
  const on_refresh_needed = function() {
    set_extra_data(new Date());
  };
  
  const render_found = function(row) {
    return <Row row={row} navigation={navigation} contacts={contacts} onRefreshNeeded={on_refresh_needed}/>;
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
    <Header on_press_back={on_press_back} title="Contacts"/>
     <View style={{ flex: 1 }} contentContainerStyle={{flexGrow: 1}}>
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
      {!isError && !isBusy && (
        <FlatList
          style={{flex: 1}}
          keyboardShouldPersistTaps="always"
          data={contacts ? contacts.data: null}
          renderItem={render_found}
          keyExtractor = { item => item.id }
          extraData = { extra_data }
        />
      )}
     </View>
    </SafeAreaView>
  );
};


export default ContactsScreen;