"use strict";
import _ from "underscore";
import { useState } from "react";
import { View } from 'react-native';
import { Button, HelperText, SegmentedButtons } from "react-native-paper";

const ListHeader = function({ is_error, on_press_retry, screen, on_seg_press }) {
  const [seg_value, set_seg_value] = useState("everyone");
  
  const local_on_press_retry = function() {
    on_press_retry();
  };
  
  const local_on_seg_press = function(value) {
    set_seg_value(value);
    _.isFunction(on_seg_press) && on_seg_press(value);
  };
  
  return (
    <View style={{alignItems: "center"}}>
    {screen === "EmojiScreen" && (
      <SegmentedButtons
        style={{marginBottom: 10}}
        value={seg_value}
        onValueChange={local_on_seg_press}
        buttons={[
          {
            icon: "account-multiple",
            value: 'everyone',
            label: 'Everyone (22)',
          },
          {
            icon: "account",
            value: 'you',
            label: 'You (0)',
          }
        ]}
      />
    )}
    {is_error && (
      <View style={{marginTop: 40}}>
        <Button mode="contained" onPress={local_on_press_retry}>Retry</Button>
        <HelperText type="error">Somthing went wrong!</HelperText>
      </View>
    )}
    </View>
  );
};


export default ListHeader;