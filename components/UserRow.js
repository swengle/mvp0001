"use strict";
import $ from "../setup";
import _ from "underscore";
import { useState } from "react";
import { useToast } from "react-native-toast-notifications";
import { View } from 'react-native';
import { Avatar, Button, HelperText, Text, useTheme } from "react-native-paper";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getHex } from "pastel-color";

const get_relationship_action = function(status) {
  if (status === "none" || status === "unfollow") {
      return "follow";
    } else if (status === "request" || status === "follow" || status === "ignore") {
      return "unfollow";
    } else if (status === "block") {
      return "unblock";
    }
};

const get_intended_relationship_status = function(status, is_account_public) {
  if (status === "none" || status === "unfollow") {
    return is_account_public ? "follow" : "request";
  } else if (status === "follow" || status === "request" || status === "block") {
    return "none";
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

const UserRow = function({navigation, user_id, contact, onRefreshNeeded}) {
  const user = $.cache.get(user_id);
  const snap_user = $.cache.get_snap(user_id);
  const current_user = $.get_current_user();
  const toast = useToast();
  const { colors } = useTheme();
  const [is_busy, set_is_busy] = useState();
  
  const on_press_relationship = async function() {
    const original = user.outgoing_relationship;
    try {
      set_is_busy(true);
      user.outgoing_relationship = get_intended_relationship_status(original, snap_user.is_account_public);
      const action = get_relationship_action(original);

      if (action === "follow") {
        if (snap_user.is_account_public) {
          user.follow_by_count++;
          current_user.follow_count++;
        } else {
          user.request_by_count++;
          current_user.request_count++;
        }
      } else if (action === "unfollow") {
        if (original === "follow") {
          user.follow_by_count--;
          current_user.follow_count--;
        } else {
          user.request_by_count--;
          current_user.request_count--;
        }
      } else if (action === "unblock") {
        user.block_by_count--;
        current_user.block_count--;
      }
      const response = (await $.axios_api.post("/users/" + user.id + "/relationship", {action: action})).data;
      user.outgoing_relationship = response.outgoing_status;
    } catch (e) {
      user.outgoing_relationship = original;
      $.display_error(toast, new Error("Failed to update relationship."));
    } finally {
      set_is_busy(false);
    }
  };

  const on_press_invite = async function() {
    const original = contact.is_invited;
    try {
      set_is_busy(true);
      _.extend(contact, {is_invited: new Date().toISOString()});
      onRefreshNeeded();
      const response = (await $.axios_api.post("/invite-contacts", {phones: contact.parsed_number, name: contact.contact_name})).data;
      _.extend(contact, response);
      onRefreshNeeded();
    } catch (e) {
      _.extend(contact, {is_invited: original});
      onRefreshNeeded();
      $.display_error(toast, new Error("Failed to send invite."));
    } finally {
      set_is_busy(false);
    }
  };
  
  if (user) {
    return (
      <View style={{flexDirection: "row", alignItems: "center", padding: 10}}>
        <View style={{flex: 7, flexDirection: "row", alignItems: "center"}}>
          <Avatar.Image size={64} source={{uri: snap_user.profile_image_url}} style={{marginRight: 10}}/>
          <View>
            <Text variant="titleSmall">{snap_user.username}</Text>
            {snap_user.name &&  <Text variant="bodySmall">{snap_user.name}</Text>}
            <Text variant="labelMedium" style={{color: colors.outline}}><MaterialCommunityIcons name="account-box-outline" size={14} />{contact.contact_name}</Text>
          </View>
        </View>
        <View style={{flex: 3}}>
          <Button mode="contained" compact={true} onPress={on_press_relationship}>{get_relationship_button_text(snap_user.outgoing_relationship)}</Button>
        </View>
      </View>
    );
  }
  
  let is_invited = (contact.invited_at && Date.now() - new Date(contact.invited_at).getTime() < (30 * 24 * 60 * 60 * 1000)) ? true : false; 
  
  return (
    <View style={{flexDirection: "row", alignItems: "center", padding: 10}}>
      <View style={{flex: 7, flexDirection: "row", alignItems: "center"}}>
        <Avatar.Image size={64} source={{uri: "https://ui-avatars.com/api/?name=" + contact.contact_name + "&size=110&length=2&rounded=true&color=ffffff&background=" + getHex(contact.contact_name).replace("#", "")}} style={{marginRight: 10}}/>
        <View style={{flex: 1}}>
          <Text variant="titleSmall" style={{color: colors.outline}} numberOfLines={1}><MaterialCommunityIcons name="account-box-outline" size={14} />{contact.contact_name}</Text>
        </View>
      </View>
      <View style={{flex: 3}}>
        <Button disabled={is_invited|| is_busy} mode="contained" compact={true} onPress={on_press_invite}>{is_invited ? "Invited" : "Invite"}</Button>
        {contact.invited_at && (<HelperText style={{textAlign: "center"}}>{$.timeago.format(contact.invited_at)}</HelperText>)}
      </View>
    </View>
  );
};


export default UserRow;