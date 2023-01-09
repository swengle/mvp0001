"use strict";
import $ from "../../setup";
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Button, Checkbox, List} from "react-native-paper";
import { getAuth, signOut } from "firebase/auth";
import * as WebBrowser from 'expo-web-browser';
import { useSnapshot } from "valtio";
import firestore from "../../firestore/firestore";
import useGlobalCache from "../../hooks/useGlobalCache";

const SettingsScreen = function({navigation}) {
  const current_user = $.get_current_user();
  const snap_current_user = $.get_snap_current_user();
  const snap_app = useSnapshot($.app);
  
  const { flush_all } = useGlobalCache();

  const on_press_back = function() {
    navigation.goBack();
  };
  
  const on_press_logout = async function() {
    delete $.session.uid;
    const auth = getAuth();
    await signOut(auth);
    flush_all();
  };
  
  const on_press_profile = function() {
    navigation.push("ProfileScreen");
  };
  
  const on_press_notifications = function() {
    navigation.push("NotificationsScreen");
  };
  
  const on_press_private = async function() {
    try {
      current_user.is_account_public = !current_user.is_account_public;
      await firestore.update_current_user_account_privacy({
        is_account_public: current_user.is_account_public
      });
    } catch (e) {
      $.logger.error(e);
      current_user.is_account_public = !current_user.is_account_public;
    }
  };
  
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
  
  const on_press_dark_mode = function() {
    if ($.app.scheme === "dark") {
      delete $.app.scheme;
    } else {
      $.app.scheme = "dark";
    }
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
     <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>
      <ScrollView style={{flex: 1}}>
        <List.Section>
          <List.Subheader>Privacy</List.Subheader>
          <List.Item
            title="Private account"
            description="Only your friends can see your status."
            left={props => <List.Icon {...props} icon="lock" />}
            right={props => <Checkbox  status={snap_current_user.is_account_public ? 'unchecked' : 'checked'}/>}
            onPress={on_press_private}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>General</List.Subheader>
          <List.Item
            title="Profile"
            description="Avatar, name, bio, ..."
            left={props => <List.Icon {...props} icon="account" />}
            right={props => <List.Icon {...props} icon="chevron-right"/>}
            onPress={on_press_profile}
          />
          <List.Item
            title="Notifications"
            description="Choose what will notify you."
            left={props => <List.Icon {...props} icon="bell-ring" />}
            right={props => <List.Icon {...props} icon="chevron-right"/>}
            onPress={on_press_notifications}
          />
        </List.Section>
        
        <List.Section>
          <List.Subheader>Appearance</List.Subheader>
          <List.Item
            title="Dark mode"
            description="Keep dark mode on."
            left={props => <List.Icon {...props} icon="brightness-6" />}
            right={props => <Checkbox  status={snap_app.scheme === "dark" ? 'checked' : 'unchecked'}/>}
            onPress={on_press_dark_mode}
          />
        </List.Section>
      
        <List.Section>
          <List.Subheader>About</List.Subheader>
          <List.Item
            title="Terms of Service"
            left={props => <List.Icon {...props} icon="file-document" />}
            right={props => <List.Icon {...props} icon="chevron-right"/>}
            onPress={on_press_terms_of_service}
          />
          <List.Item
            title="Privacy Policy"
            left={props => <List.Icon {...props} icon="file-document" />}
            right={props => <List.Icon {...props} icon="chevron-right"/>}
            onPress={on_press_privacy_policy}
          />
        </List.Section>
      
        <Button mode = "contained" style={{margin: 40}} onPress={on_press_logout}>Logout</Button>
      </ScrollView>
    </SafeAreaView>
  );
};


export default SettingsScreen;