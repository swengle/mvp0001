"use strict";
import _ from "underscore";
import { View } from 'react-native';
import { Button, HelperText } from "react-native-paper";

const ListHeader = function({ is_error, on_press_retry, screen }) {
  const local_on_press_retry = function() {
    on_press_retry();
  };
  
  return (
    <View style={{alignItems: "center"}}>
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