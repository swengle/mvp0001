"use strict";
import $ from "../../setup";
import { Fragment, useEffect, useState } from "react";
import { useToast } from "react-native-toast-notifications";
import { Image, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Avatar, Badge, Button, Chip, Text, useTheme } from "react-native-paper";
import * as Contacts from 'expo-contacts';
import { doc, getDoc } from "firebase/firestore";
import firestore from "../../firestore/firestore";
import Post from "../../components/Post";

const get_relationship_action = function(status) {
  if (status === "none" || status === "unfollow") {
      return "follow";
    } else if (status === "request" || status === "follow" || status === "ignore") {
      return "unfollow";
    } else if (status === "block") {
      return "unblock";
    }
};

const get_relationship_button_text = function(status) {
  if (status === "none" || status === "unfollow") {
    return "Follow";
  } else if (status === "follow") {
    return "Following";
  } else if (status === "request" || status === "ignore") {
    return "Requested";
  } else if (status === "block") {
    return "Unblock";
  }
  return status;
};

const User = function({navigation, route}) {
  let uid, is_tabs_screen;
  if (route.params && route.params.uid) {
    uid = route.params.uid;
    is_tabs_screen = false;
  } else {
    uid = $.session.uid;
    is_tabs_screen = true;
  }
  const user = $.cache.get(uid);
  if (!user) {
    return null;
  }
  
  const cache = $.cache.get_snap();
  
  const snap_user = cache[uid];
  
  const toast = useToast();
  const { colors } = useTheme();
  const { dark } = useTheme();
  const {width} = useWindowDimensions();
  const [busy_button_text, set_busy_button_text] = useState();

  useEffect(() => {
    const ref_user_doc = doc($.db, "user", uid);
    const snap_user_doc = getDoc(ref_user_doc);
    if (snap_user_doc.exists) {
      const user = snap_user_doc.data();
      $.cache.set(user);
      if (user.current_post_id) {
        const ref_post_doc = doc($.db, "post", user.current_post_id);
        const snap_post_doc = getDoc(ref_post_doc);
        if (snap_post_doc.exists()) {
          const post = snap_post_doc.data();
          $.cache.set(post);
        }
      }
    }
  }, []);
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const on_press_followers = function() {
    navigation.push("UserListScreen", {uid: uid, title: "Followers"});
  };
  
  const on_press_following = function() {
    navigation.push("UserListScreen", {uid: uid, title: "Following"});
  };

  const post_count = snap_user.post_count || 0;
  
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
  
  const on_press_relationship = async function() {
    try {
      const action = get_relationship_action(user.outgoing_status);
      if (action === "follow") {
        set_busy_button_text(user.is_account_public ? "Following" : "Requested");
      } else if (action === "unfollow" || action === "unblock") {
        user.outgoing_status = "none";
        set_busy_button_text("Follow");
      } else if (action === "block") {
        set_busy_button_text("Unblock");
      }
      
      await firestore.update_relationship({
        uid : uid,
        action: action
      });
    } catch (e) {
      console.log(e);
      set_busy_button_text(null);
      $.display_error(toast, new Error("Failed to update relationship."));
    }
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['right', 'top', 'left']}>
      <Appbar.Header>
        { !is_tabs_screen && (<Appbar.BackAction onPress={on_press_back} />) }
        <Appbar.Content title={snap_user.username}  />
        { uid === $.session.uid && (
          <Fragment>
            <View>
              <Appbar.Action icon="clock" onPress={on_press_history} />
              <Badge style={{position: "absolute", backgroundColor: colors.outline}}>{post_count}</Badge>
            </View>
            <Appbar.Action icon="account-group" onPress={on_press_contacts} />
            <Appbar.Action icon="cog" onPress={on_press_settings} />
          </Fragment>
        )}
      </Appbar.Header>
      <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <ScrollView style={{ flex: 1 }}>
          <View style={{margin: 10, marginTop: 0, flexDirection: "row", alignItems: "center"}}>
            <Avatar.Image size={80} source={{uri: snap_user.profile_image_url}} />

            <View style={{flex: 1, flexDirection: "column", marginHorizontal: 20}}>
              {snap_user.name && (<Text variant="titleMedium" style={{marginVertical: 10, alignSelf: "center"}}>{snap_user.name}</Text>)}
              {!snap_user.name && (<View style={{height: 24}}/>)}
              <View style={{flex: 1, flexDirection: "row", alignItems: "center"}}>
                <View style={{flex: 1}}>
                  <Chip style={{marginRight: 8, alignItems: "center"}} mode="outlined" onPress={on_press_followers}>{snap_user.follow_by_count || 0} {snap_user.follow_by_count === 1 ? "Follower" : "Followers"}</Chip>
                </View>
                <View style={{flex: 1}}>
                  <Chip style={{alignItems: "center"}} mode="outlined" onPress={on_press_following}>{snap_user.follow_count || 0} Following</Chip>
                </View>
              </View>
              {uid === $.session.uid && <View style={{height: 24}}/>}
              {uid !== $.session.uid && <Button mode="contained" style={{marginTop: 16, width: "100%"}} onPress={on_press_relationship}>{busy_button_text ? busy_button_text : get_relationship_button_text(snap_user.outgoing_status)}</Button>}
            </View>
          </View>

          <View style={{margin: 10, marginTop: 0}}>
            {snap_user.bio && <Text>{snap_user.bio}</Text>}
          </View>
          
          {!snap_user.current_post_id && (
            <View style={{marginBottom: 20, padding: 20, paddingLeft: 30}}>
              { dark && <Image source={require("../../assets/dark-puzzled-500.png")} style={{width: width-40, height: width-40}}/>}
              { !dark && <Image source={require("../../assets/light-puzzled-500.png")} style={{width: width-40, height: width-40}}/>}
            </View>
          )}
          
          {snap_user.current_post_id && (
            <View style={{marginBottom: 20}}>
              <Post navigation={navigation} id={snap_user.current_post_id}  number_columns={1}/>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default User;