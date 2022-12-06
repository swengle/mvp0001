"use strict";
import $ from "../../setup";
import { useEffect } from "react";
import { View } from 'react-native';

const HomeScreen = function() {
  useEffect(() => {
    $.check_notification_permissions();    
  }, []);

  return (
    <View style ={{flex:1}}>

    </View>
  );
};

export default HomeScreen;
