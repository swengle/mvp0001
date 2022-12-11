"use strict";
import $ from "../setup";
import { useState } from "react";
import { useToast } from "react-native-toast-notifications";
import { View } from 'react-native';
import { Avatar, Button, HelperText, Text, useTheme } from "react-native-paper";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getHex } from "pastel-color";
import firestore from "../firestore/firestore";
import { Timestamp } from "firebase/firestore";
import { useSnapshot } from "valtio";

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

const UserRow = function({row_id, navigation, onRefreshNeeded}) {
  const row_snap = useSnapshot($.contacts_rows_by_id[row_id]);
  const row = $.contacts_rows_by_id[row_id];
  const toast = useToast();
  const { colors } = useTheme();
  const [busy_button_text, set_busy_button_text] = useState();
  
  const on_press_relationship = async function() {
    try {
      const action = get_relationship_action(row.relationship.status);
      if (action === "follow") {
        set_busy_button_text(row.user.is_account_public ? "Following" : "Requested");
      } else if (action === "unfollow" || action === "unblock") {
        set_busy_button_text("Follow");
      } else if (action === "block") {
        set_busy_button_text("Unblock");
      }
      await firestore.update_relationship({
        uid: $.session.uid,
        user : row.user,
        action: action
      });
    } catch (e) {
      set_busy_button_text(null);
      $.display_error(toast, new Error("Failed to update relationship."));
    }
  };

  const on_press_invite = async function() {
    try {
      row.invited_at = Timestamp.now();
      await firestore.invite_contact({uid: $.session.uid, phones: row.parsed_number, name: row.contact_name});
    } catch (e) {
      delete row.invited_at;
      $.display_error(toast, new Error("Failed to send invite."));
    }
  };
  
  if (row_snap.user) {
    return (
      <View style={{flexDirection: "row", alignItems: "center", padding: 10}}>
        <View style={{flex: 7, flexDirection: "row", alignItems: "center"}}>
          <Avatar.Image size={64} source={{uri: row_snap.user.profile_image_url}} style={{marginRight: 10}}/>
          <View>
            <Text variant="titleSmall">{row_snap.user.username}</Text>
            {row_snap.user.name &&  <Text variant="bodySmall">{row_snap.user.name}</Text>}
            <Text variant="labelMedium" style={{color: colors.outline}}><MaterialCommunityIcons name="account-box-outline" size={14} />{row.contact_name}</Text>
          </View>
        </View>
        {row_snap.relationship && (
          <View style={{flex: 3}}>
            <Button mode="contained" compact={true} onPress={on_press_relationship}>{busy_button_text ? busy_button_text : get_relationship_button_text(row_snap.relationship.status)}</Button>
          </View>
        )}
      </View>
    );
  }
  
  let is_invited, invited_at;
  if (row_snap.invited_at) {
    invited_at = row_snap.invited_at.toDate ? row_snap.invited_at.toDate() : new Date(row_snap.invited_at);
    // 30 days
    is_invited = (invited_at && (Date.now() - invited_at.getTime() < (30 * 24 * 60 * 60 * 1000))) ? true : false; 
  }
  
  return (
    <View style={{flexDirection: "row", alignItems: "center", padding: 10}}>
      <View style={{flex: 7, flexDirection: "row", alignItems: "center"}}>
        <Avatar.Image size={64} source={{uri: "https://ui-avatars.com/api/?name=" + row_snap.contact_name + "&size=110&length=2&rounded=true&color=ffffff&background=" + getHex(row_snap.contact_name).replace("#", "")}} style={{marginRight: 10}}/>
        <View style={{flex: 1}}>
          <Text variant="titleSmall" style={{color: colors.outline}} numberOfLines={1}><MaterialCommunityIcons name="account-box-outline" size={14} />{row_snap.contact_name}</Text>
        </View>
      </View>
      {!row_snap.uid && (
        <View style={{flex: 3}}>
          <Button disabled={is_invited || busy_button_text} mode="contained" compact={true} onPress={on_press_invite}>{busy_button_text ? busy_button_text : (is_invited ? "Invited" : "Invite")}</Button>
          {row_snap.invited_at && (<HelperText style={{textAlign: "center"}}>{$.timeago.format(invited_at)}</HelperText>)}
        </View>
      )}
    </View>
  );
};


export default UserRow;