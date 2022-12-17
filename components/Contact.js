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

const Contact = function({row_id, navigation}) {
  const row_snap = useSnapshot($.contacts_rows_by_id[row_id]);
  const row = $.contacts_rows_by_id[row_id];
  const toast = useToast();
  const { colors } = useTheme();
  const [busy_button_text, set_busy_button_text] = useState();

  const on_press_invite = async function() {
    try {
      row.invited_at = Timestamp.now();
      await firestore.invite_contact({phones: row.parsed_number, name: row.contact_name});
    } catch (e) {
      $.logger.error(e);
      delete row.invited_at;
      $.display_error(toast, new Error("Failed to send invite."));
    }
  };

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
      <View style={{flex: 3}}>
        <Button disabled={is_invited || busy_button_text} mode="contained" compact={true} onPress={on_press_invite}>{busy_button_text ? busy_button_text : (is_invited ? "Invited" : "Invite")}</Button>
        {row_snap.invited_at && (<HelperText style={{textAlign: "center"}}>{$.timeago.format(invited_at)}</HelperText>)}
      </View>
    </View>
  );
};


export default Contact;