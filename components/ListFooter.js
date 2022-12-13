"use strict";
import { View } from 'react-native';
import { ActivityIndicator, Button, HelperText } from "react-native-paper";

const ListFooter = function({ is_error, is_loading_more, on_press_retry }) {
  const local_on_press_retry = function() {
    on_press_retry();
  };
  
  if (is_loading_more) {
    return (
      <View style={{marginVertical: 20, alignItems: "center", justifyContent: "center"}}>
        <ActivityIndicator/>
      </View>
    );
  }
  
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