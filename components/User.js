"use strict";
import $ from "../setup";
import { useState } from "react";
import { useToast } from "react-native-toast-notifications";
import { TouchableOpacity, View } from 'react-native';
import { Avatar, Button, Text, useTheme } from "react-native-paper";
import firestore from "../firestore/firestore";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import useCachedData from "../hooks/useCachedData";

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

const User = function({id, row_id, navigation}) {
  const row = $.contacts_rows_by_id[row_id];
  
  const { colors } = useTheme();
  const toast = useToast();
  const [busy_button_text, set_busy_button_text] = useState();
  
  const { cache_get, cache_get_snap } = useCachedData();
  const user = cache_get(id);
  
  if (!user) {
    return null;
  }
  
  const snap_user = cache_get_snap(id);
  
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
        id : id,
        action: action
      });
    } catch (e) {
      $.logger.error(e);
      set_busy_button_text(null);
      $.display_error(toast, new Error("Failed to update relationship."));
    }
  };
  
  const on_press_user = function() {
    navigation.push("UserScreen", {id: id});
  };
  

  return (
    <View style={{flexDirection: "row", alignItems: "center", padding: 10}}>
      <TouchableOpacity onPress={on_press_user} style={{flex: 7, flexDirection: "row", alignItems: "center"}}>
        <Avatar.Image size={64} source={{uri: snap_user.profile_image_url}} style={{marginRight: 10}}/>
        <View>
          <Text variant="titleSmall">{snap_user.username}</Text>
          {snap_user.name && <Text variant="bodySmall">{snap_user.name}</Text>}
          {row && row.contact_name && <Text variant="labelMedium" style={{color: colors.outline}}><MaterialCommunityIcons name="account-box-outline" size={14} />{row.contact_name}</Text>}
        </View>
      </TouchableOpacity>
      {(id !== $.session.uid) && (
        <View style={{flex: 3}}>
          <Button mode="contained" compact={true} onPress={on_press_relationship}>{busy_button_text ? busy_button_text : get_relationship_button_text(snap_user.outgoing_status)}</Button>
        </View>
      )}
    </View>
  );
};


export default User;