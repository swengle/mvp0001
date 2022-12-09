"use strict";
import { View } from 'react-native';
import { Button, HelperText } from "react-native-paper";

const ListFooter = function({ is_error, on_press_retry }) {
  const local_on_press_retry = function() {
    on_press_retry();
  };
  
  if (!is_error) {
    return null;
  }

  return (
    <View style={{alignItems: "center", marginTop: 40}}>
      <Button mode="contained" onPress={local_on_press_retry}>Retry</Button>
      <HelperText type="error">Somthing went wrong!</HelperText>
    </View>    
  );
};


export default ListFooter;