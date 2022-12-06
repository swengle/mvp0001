"use strict";
import $ from "../../setup";
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Checkbox, Switch, Text, List} from "react-native-paper";
import Header from "../../components/Header";
import {useSnapshot} from "valtio";


const Notificationscreen = function({navigation}) {
  const current_user = $.get_current_user();
  const snap_current_user = $.get_snap_current_user();
  const snap_session = useSnapshot($.session);
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const on_press_likes = function() {
    
  };
  
  const on_press_open_settings = function() {
    $.openAppSettings();
  };
  
  if (!snap_session.messaging_token) {
    return (
      <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
        <Header on_press_back={on_press_back} title="Notification Settings"/>
        <View style={{flex: 1, alignItems: "center", justifyContent: "center", padding: 10}}>
          <Text>Notifications are not enabled in application settings.</Text>
          <Button onPress={on_press_open_settings}>Open Settings</Button>
        </View>
      </SafeAreaView>
    );
  }
  
  const settings = snap_current_user.settings_messaging[snap_session.messaging_token];
  
  
  const save_messaging_setting = async function(setting_name, setting_value) {
    const orig = current_user.settings_messaging[snap_session.messaging_token][setting_name];
    current_user.settings_messaging[snap_session.messaging_token][setting_name] = setting_value;
    try {
      await $.axios_api.post("/users/me/messaging-setting", {token: snap_session.messaging_token, setting_name: setting_name, setting_value: setting_value});
    } catch (e) {
      console.log(e);
      current_user.settings_messaging[snap_session.messaging_token][setting_name] = orig;
    }
  };
  
  const on_toggle_pause_all = async function() {
    await save_messaging_setting("is_pause_enabled", !settings.is_pause_enabled);
  };
  
  const on_press_is_likes_disabled = async function() {
    await save_messaging_setting("is_likes_disabled", !settings.is_likes_disabled);
  };
  
  const on_press_is_comments_disabled = async function() {
    await save_messaging_setting("is_comments_disabled", !settings.is_comments_disabled);
  };
  
  const on_press_is_follower_requests_disabled = async function() {
    await save_messaging_setting("is_follower_requests_disabled", !settings.is_follower_requests_disabled);
  };
  
  const on_press_accepted_follower_requests_disabled = async function() {
    await save_messaging_setting("is_accepted_follower_requests_disabled", !settings.is_accepted_follower_requests_disabled);
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
    <Header on_press_back={on_press_back} title="Notification Settings"/>
    <ScrollView style={{flex: 1}}>
      <List.Section>
        <List.Subheader>General</List.Subheader>
        <List.Item
          title="Pause All"
          description="Pause all push notifications"
          left={props => <List.Icon {...props} icon="pause" />}
          right={props => <Switch value={settings.is_pause_enabled} onValueChange={on_toggle_pause_all} />}
          onPress={on_press_likes}
        />
      </List.Section>
      
      <List.Section>
        <List.Subheader>Posts</List.Subheader>
        <List.Item
          title="Likes"
          description="joesmoe liked your photo"
          left={props => <List.Icon {...props} icon="heart" />}
          right={props => <Checkbox  status={settings.is_likes_disabled ? 'unchecked' : 'checked'}/>}
          onPress={on_press_is_likes_disabled}
        />
        <List.Item
          title="Comments"
          description={"joesmoe commented: \"Go team USA!\""} 
          left={props => <List.Icon {...props} icon="comment" />}
          right={props => <Checkbox  status={settings.is_comments_disabled ? 'unchecked' : 'checked'}/>}
          onPress={on_press_is_comments_disabled}
        />
      </List.Section>
        
      <List.Section>
        <List.Subheader>Following and Followers</List.Subheader>
        <List.Item
          title="Follower Requests"
          description="joesmoe requests to follow you."
          left={props => <List.Icon {...props} icon="account-plus" />}
          right={props => <Checkbox  status={settings.is_follower_requests_disabled ? 'unchecked' : 'checked'}/>}
          onPress={on_press_is_follower_requests_disabled}
        />
        <List.Item
          title="Accepted Follow Requests"
          description="joesmoe accepted your follow request."
          left={props => <List.Icon {...props} icon="account-check" />}
          right={props => <Checkbox  status={settings.is_accepted_follower_requests_disabled ? 'unchecked' : 'checked'}/>}
          onPress={on_press_accepted_follower_requests_disabled}
          />
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
};


export default Notificationscreen;