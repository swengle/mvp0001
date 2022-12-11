"use strict";
import $ from "../../setup";
import { Fragment, useEffect, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Avatar, Badge, Button, Chip, Text, useTheme } from "react-native-paper";
import * as Contacts from 'expo-contacts';
import { doc, onSnapshot } from "firebase/firestore";

import SwengleImage from "../../components/SwengleImage";

const _1080 = "1080";

const User = function({navigation, route}) {
  let user_id, is_tabs_screen;
  if (route.params && route.params.user_id) {
    user_id = route.params.user_id;
    is_tabs_screen = false;
  } else {
    user_id = $.session.uid;
    is_tabs_screen = true;
  }
  
  //const [is_tabs_screen] = useState(is_tabs_screen);
  const { colors } = useTheme();
  const [user, set_user] = useState();
  const [post, set_post] = useState();
  const [ is_ready, set_is_ready] = useState(false);
  const { dark } = useTheme();
  const {width} = useWindowDimensions();
  let unsubscribe_user, unsubscribe_post;
  
  useEffect(() => {
    unsubscribe_user = onSnapshot(doc($.db, "user", user_id), async (user_doc) => {
      if (user_doc.exists()) {
        const user = user_doc.data();
        set_user(user);
        if (user.current_post_id && (!post || user.current_post_id !== post.id)) {
          if (unsubscribe_post) {
            unsubscribe_post();
          }
          unsubscribe_post = onSnapshot(doc($.db, "post", user.current_post_id), async (post_doc) => {
            if (post_doc.exists()) {
              set_post(post_doc.data());
            } else {
              set_post(null);
            }
            set_is_ready(true);
          });
        } else {
          set_is_ready(true);
        }
      } else {
        set_user(null);
        set_is_ready(true);
      }
    });
    return unsubscribe_user;
  }, []);
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const on_press_followers = function() {
    navigation.push("UserListScreen", {user_id: user.id, title: "Followers"});
  };
  
  const on_press_following = function() {
    navigation.push("UserListScreen", {user_id: user.id, title: "Following"});
  };
  
  const on_press_follow = function() {
    
  };
  
  if (!user) {
    return null;
  }

  const height = post ? (width * (post.image_urls[_1080].height/post.image_urls[_1080].width)) : 0;
  const post_count = user.post_count || 0;
  
  const on_press_settings = function() {
    navigation.push("SettingsStack");
  };
  
  const on_press_contacts = async function() {
    const { status } = await Contacts.requestPermissionsAsync();
    if (!status) {
      $.dialog.is_contacts_permission_visible = true;
      return;
    }
    navigation.push("ContactsStack"); 
  };
  
  const on_press_history = function() {
    navigation.push("HistoryScreen"); 
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['right', 'top', 'left']}>
      <Appbar.Header>
        { !is_tabs_screen && (<Appbar.BackAction onPress={on_press_back} />) }
        <Appbar.Content title={user.username}  />
        { user_id === $.session.uid && (
          <Fragment>
            <View>
              <Appbar.Action icon="clock" onPress={on_press_history} />
              <Badge style={{position: "absolute", backgroundColor: colors.outline}}>{post_count}</Badge>
            </View>
            <Appbar.Action icon="account-group" onPress={on_press_contacts} />
            <Appbar.Action icon="cog-outline" onPress={on_press_settings} />
          </Fragment>
        )}
      </Appbar.Header>
      <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{flexGrow: 1}}>
          <View style={{margin: 10, marginTop: 0, flexDirection: "row", alignItems: "center"}}>
            <Avatar.Image size={80} source={{uri: user.profile_image_url}} />
            <View style={{flex: 1, alignItems: "center"}}>
              <View style={{flexDirection: "column"}}>
                {user.name && (<Text variant="titleMedium" style={{marginVertical: 10, alignSelf: "center"}}>{user.name}</Text>)}
                <View style={{flexDirection: "row", justifyContent: "center"}}>
                  <Chip mode="outlined" onPress={on_press_followers}>{user.follow_by_count || 0} Followers</Chip>
                  <View style={{marginLeft: 8}}>
                    <Chip mode="outlined" onPress={on_press_following}>{user.follow_count || 0} Following</Chip>
                  </View>
                </View>
                {user_id !== $.session.uid && <Button mode="contained" style={{marginHorizontal: 30, marginTop: 16}} onPress={on_press_follow}>Follow</Button>}
              </View>
            </View>
          </View>

          <View style={{margin: 10, marginTop: 0}}>
            {user.bio && <Text>{user.bio}</Text>}
          </View>
          
          {is_ready && !post && (
            <View style={{height: height, marginBottom: 20, padding: 20, paddingLeft: 30}}>
              { dark && <Image source={require("../../assets/dark-puzzled-500.png")} style={{width: width-40, height: width-40}}/>}
              { !dark && <Image source={require("../../assets/light-puzzled-500.png")} style={{width: width-40, height: width-40}}/>}
            </View>
          )}
          
          {is_ready && post && (
            <View style={{height: height, marginBottom: 20}}>
              <SwengleImage source={{uri: post.image_urls[_1080].url}} style={{width: width, height: height}}/>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default User;