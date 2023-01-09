"use strict";
import $ from "../../setup";
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Button, Checkbox, Switch, Text, List} from "react-native-paper";
import {useSnapshot} from "valtio";
import firestore from "../../firestore/firestore";

const Notificationscreen = function({navigation}) {
  const snap_session = useSnapshot($.session);
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const on_press_open_settings = function() {
    $.openAppSettings();
  };
  
  if (!snap_session.messaging_config) {
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

  const save_messaging_config = async function(setting_name, setting_value) {
    const new_setting = {};
    new_setting[setting_name] = setting_value;
    await firestore.update_messaging_config({
      token: $.session.messaging_config.token,
      settings: new_setting
    });
  };
  
  const on_toggle_pause_all = async function() {
    await save_messaging_config("is_pause_enabled", !$.session.messaging_config.is_pause_enabled);
  };
  
  const on_press_is_likes_disabled = async function() {
    await save_messaging_config("is_likes_disabled", !$.session.messaging_config.is_likes_disabled);
  };
  
  const on_press_is_comments_disabled = async function() {
    await save_messaging_config("is_comments_disabled", !$.session.messaging_config.is_comments_disabled);
  };
  
  const on_press_is_follower_requests_disabled = async function() {
    await save_messaging_config("is_follower_requests_disabled", !$.session.messaging_config.is_follower_requests_disabled);
  };
  
  const on_press_accepted_follower_requests_disabled = async function() {
    await save_messaging_config("is_accepted_follower_requests_disabled", !$.session.messaging_config.is_accepted_follower_requests_disabled);
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
    <Appbar.Header>
      <Appbar.BackAction onPress={on_press_back} />
      <Appbar.Content title="Notification Settings" />
    </Appbar.Header>
    
    <ScrollView style={{flex: 1}}>
      <List.Section>
        <List.Subheader>General</List.Subheader>
        <List.Item
          title="Pause All"
          description="Pause all push notifications"
          left={props => <List.Icon {...props} icon="pause" />}
          right={props => <Switch value={$.session.messaging_config.is_pause_enabled} onValueChange={on_toggle_pause_all} />}
        />
      </List.Section>
      
      <List.Section>
        <List.Subheader>Posts</List.Subheader>
        <List.Item
          title="Likes"
          description="joesmoe liked your photo"
          left={props => <List.Icon {...props} icon="heart" />}
          right={props => <Checkbox  status={$.session.messaging_config.is_likes_disabled ? 'unchecked' : 'checked'}/>}
          onPress={on_press_is_likes_disabled}
        />
        <List.Item
          title="Comments"
          description={"joesmoe commented: \"Go team USA!\""} 
          left={props => <List.Icon {...props} icon="comment" />}
          right={props => <Checkbox  status={$.session.messaging_config.is_comments_disabled ? 'unchecked' : 'checked'}/>}
          onPress={on_press_is_comments_disabled}
        />
      </List.Section>
        
      <List.Section>
        <List.Subheader>Following and Followers</List.Subheader>
        <List.Item
          title="Follower Requests"
          description="joesmoe requests to follow you."
          left={props => <List.Icon {...props} icon="account-plus" />}
          right={props => <Checkbox  status={$.session.messaging_config.is_follower_requests_disabled ? 'unchecked' : 'checked'}/>}
          onPress={on_press_is_follower_requests_disabled}
        />
        <List.Item
          title="Accepted Follow Requests"
          description="joesmoe accepted your follow request."
          left={props => <List.Icon {...props} icon="account-check" />}
          right={props => <Checkbox  status={$.session.messaging_config.is_accepted_follower_requests_disabled ? 'unchecked' : 'checked'}/>}
          onPress={on_press_accepted_follower_requests_disabled}
          />
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
};


export default Notificationscreen;