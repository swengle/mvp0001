"use strict";
import $ from "../setup";
import { useState } from "react";
import { useToast } from "react-native-toast-notifications";
import { TouchableOpacity, View } from 'react-native';
import { Avatar, Button, Text } from "react-native-paper";
import firestore from "../firestore/firestore";

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

const UserRow2 = function({row_id, navigation, rows_by_id}) {
  const row = rows_by_id[row_id];
  const toast = useToast();
  const [busy_button_text, set_busy_button_text] = useState();
  
  const on_press_relationship = async function() {
    try {
      const action = get_relationship_action(row.relationship.status);
      if (action === "follow") {
        set_busy_button_text(row.user.is_account_public ? "Following" : "Requested");
      } else if (action === "unfollow" || action === "unblock") {
        row.relationship.status = "none";
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
  
  const on_press_user = function() {
    navigation.push("UserScreen", {user_id: row.user.id});
  };

  return (
    <View style={{flexDirection: "row", alignItems: "center", padding: 10}}>
      <TouchableOpacity onPress={on_press_user} style={{flex: 7, flexDirection: "row", alignItems: "center"}}>
        <Avatar.Image size={64} source={{uri: row.user.profile_image_url}} style={{marginRight: 10}}/>
        <View>
          <Text variant="titleSmall">{row.user.username}</Text>
          {row.user.name &&  <Text variant="bodySmall">{row.user.name}</Text>}
        </View>
      </TouchableOpacity>
      {row.relationship && (row.relationship.id !== $.session.uid) && (
        <View style={{flex: 3}}>
          <Button mode="contained" compact={true} onPress={on_press_relationship}>{busy_button_text ? busy_button_text : get_relationship_button_text(row.relationship.status)}</Button>
        </View>
      )}
    </View>
  );
};


export default UserRow2;