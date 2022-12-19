"use strict";
import $ from "../../setup";
import _ from "underscore";
import { Fragment, useEffect, useState } from "react";
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Appbar, Button, HelperText, Text } from "react-native-paper";
import * as Contacts from 'expo-contacts';
import { useToast } from "react-native-toast-notifications";
import Contact from "../../components/Contact";
import User from "../../components/User";
import { getFunctions, httpsCallable } from "firebase/functions";
import firestore from "../../firestore/firestore";

import { proxy } from "valtio";

const functions = getFunctions();
const f_from_contacts = httpsCallable(functions, 'from_contacts');

$.contacts_rows_by_id = proxy({});


const Row = function({ row, navigation, user_count }) {
  console.log(user_count);
  if (row.id === "is_users_header") {
    return <Fragment><Text style={{margin: 10, marginTop: 20}} variant="titleSmall">YOUR CONTACTS ON SWENGLE</Text>{user_count === 0 && (<Text>None of your contacts ws found on swengle.</Text>)}</Fragment>;
  }
  else if (row.id === "is_contacts_header") {
    return <Fragment><Text style={{margin: 10, marginTop: (user_count > 0) ? 50 : 20}} variant="titleSmall">INVITE CONTACTS</Text></Fragment>;
  } else if (row.uid) {
    return <User id={row.uid} row_id={row.id} navigation={navigation}/>;
  } else {
    return <Contact row_id={row.id} navigation={navigation}/>; 
  }
};

const ContactsScreen = function({ navigation }) {
  const toast = useToast();
  const [data, set_data] = useState();
  const [user_count, set_user_count] = useState();
  
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
        const contacts = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
        const output = [];
        _.each(contacts.data, function(contact) {
          output.push(_.pick(contact, "name", "phoneNumbers"));
        });
        try {
          setIsBusy(true);

          const response = (await f_from_contacts({ contacts: output })).data;
          
          set_user_count(response.user_count);
          
          response.data.splice(0, 0, {
            id: "is_users_header",
            is_users_header: true
          });
          response.data.splice(response.user_count+1, 0, {
            id: "is_contacts_header",
            is_contacts_header: true
          });
          
          const final_data = [];
          _.each(response.data, function(row) {
            $.contacts_rows_by_id[row.id] = row;
            const f = {id: row.id};
            if (row.uid) {
              f.uid = row.uid;
            }
            final_data.push(f);
          });

          
          if (response.user_count > 0) {
            // starting at 1 since we added the header row
            const uids = {};
            for (let i=1; i<(response.user_count+1); i++) {
              uids[response.data[i].uid] = true;
            }
            await firestore.load_users({
              ids: _.keys(uids)
            });
          }
          set_data(final_data);
        }
        catch (e) {
          $.display_error(toast, new Error("Failed to process contacts."));
          setIsError(true);
        }
        finally {
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

  const render_found = function(r) {
    return <Row row={r.item} user_count={user_count} navigation={navigation}/>;
  };

  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
    <Appbar.Header>
      <Appbar.BackAction onPress={on_press_back} />
      <Appbar.Content title="Contacts" />
    </Appbar.Header>
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
          data={data ? data: null}
          renderItem={render_found}
          keyExtractor = { item => item.id }
        />
      )}
     </View>
    </SafeAreaView>
  );
};


export default ContactsScreen;
