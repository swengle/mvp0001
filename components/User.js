"use strict";
import $ from "../setup";
import _ from "underscore";
import { useState } from "react";
import { useToast } from "react-native-toast-notifications";
import { View } from 'react-native';
import TouchableOpacity  from "../components/TouchableOpacity";
import { Avatar, Button, Text, useTheme } from "react-native-paper";
import firestore from "../firestore/firestore";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import useGlobalCache from "../hooks/useGlobalCache";


const User = function({id, row_id, navigation, screen, on_request_approve, on_request_delete}) {
  const row = $.contacts_rows_by_id[row_id];
  
  const { colors } = useTheme();
  const toast = useToast();
  const [busy_button_text, set_busy_button_text] = useState();
  const { cache_get_snapshot  } = useGlobalCache();

  const snap_user = cache_get_snapshot(id);
  if (!snap_user) {
    return null;
  }
  
  const on_press_relationship = async function() {
    const user = useGlobalCache.cache_get(id);
    const current_status = user.outgoing_status;
    try {
      const action = $.get_relationship_action_from_status(user.outgoing_status);
      if (action === "follow") {
        set_busy_button_text(user.is_account_public ? "Following" : "Requested");
      } else if (action === "unfollow" || action === "unblock") {
        user.outgoing_status = "none";
        set_busy_button_text("Follow");
      } else if (action === "block") {
        set_busy_button_text("Unblock");
      }
      
      const result = await firestore.update_relationship({
        id : id,
        action: action
      });

      if (result.outgoing_status === "follow" && current_status !== "follow") {
        _.isNumber(user.follow_by_count) ? user.follow_by_count++ : user.follow_by_count = 1;
      } else if (result.outgoing_status !== "follow" && current_status === "follow") {
        _.isNumber(user.follow_by_count) ? user.follow_by_count-- : user.follow_by_count = 0;
      }
      
      user.outgoing_status = result.outgoing_status;
      
    } catch (e) {
      $.logger.error(e);
      set_busy_button_text(null);
      $.display_error(toast, new Error("Failed to update relationship."));
    }
  };
  
  const on_press_user = function() {
    navigation.push("PostListScreen", {screen: "UserScreen", id: id});
  };
  
  const on_press_confirm = async function() {
    try {
      await firestore.update_relationship({
        id: id,
        action: "approve"
      });
      on_request_approve(id);
    } catch (e) {
      console.error(e);
    }
  };
  
  const on_press_delete = async function() {
    try {
      await firestore.update_relationship({
        id: id,
        action: "deny"
      });
      on_request_delete(id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View>
      <View style={{flexDirection: "row", alignItems: "center", padding: 10}}>
        <TouchableOpacity onPress={on_press_user} style={{flex: 7, flexDirection: "row", alignItems: "center"}}>
          <Avatar.Image size={64} source={{uri: snap_user.profile_image_url}} style={{marginRight: 10}}/>
          <View>
            <Text variant="titleMedium">{snap_user.username}</Text>
            {snap_user.name && <Text variant="bodySmall">{snap_user.name}</Text>}
            {row && row.contact_name && <Text variant="labelMedium" style={{color: colors.outline}}><MaterialCommunityIcons name="account-box-outline" size={14} />{row.contact_name}</Text>}
          </View>
        </TouchableOpacity>
        {(screen !== "RequestByScreen" && id !== $.session.uid) && (
          <View style={{flex: 3}}>
            <Button mode="contained" compact={true} onPress={on_press_relationship}>{busy_button_text ? busy_button_text : $.get_relationship_button_text_from_status(snap_user.outgoing_status)}</Button>
          </View>
        )}
      </View>
      {screen === "RequestByScreen" && (
        <View style={{flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginRight: 10, top: -30}}>
          <Button mode="contained" compact={true} onPress={on_press_confirm} style={{marginRight: 10}}>Confirm</Button>
          <Button mode="outlined" compact={true} onPress={on_press_delete}>Delete</Button>
        </View>
      )}
    </View>
  );
};


export default User;