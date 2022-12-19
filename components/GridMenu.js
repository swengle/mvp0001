"use strict";
import { View } from 'react-native';
import { Divider, TouchableRipple, useTheme } from "react-native-paper";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

function GridMenu({ on_press_grid }) {
  const { colors } = useTheme();
  
   const on_press_grid_1 = function() {
    on_press_grid(1);
  };
  
  const on_press_grid_2 = function() {
    on_press_grid(2);
  };
  
  const on_press_grid_3 = function() {
    on_press_grid(3);
  };
  
  const on_press_grid_4 = function() {
    on_press_grid(4);
  };


  return (
    <View>
      <TouchableRipple onPress={on_press_grid_1}>
        <View style={{flexDirection: "row", padding: 10, paddingVertical: 20}}>
          <MaterialCommunityIcons name={"square"} color={colors.text}/>
        </View>
      </TouchableRipple>
      <Divider/>
      <TouchableRipple onPress={on_press_grid_2}>
        <View style={{padding: 10, paddingVertical: 20}}>
          <View style={{flexDirection: "row"}}>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
          </View>
          <View style={{flexDirection: "row"}}>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
          </View>
        </View>
      </TouchableRipple>
      <Divider/>
      <TouchableRipple onPress={on_press_grid_3}>
        <View style={{padding: 10, paddingVertical: 20}}>
          <View style={{flexDirection: "row"}}>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
          </View>
          <View style={{flexDirection: "row"}}>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
          </View>
          <View style={{flexDirection: "row"}}>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
          </View>
        </View>
      </TouchableRipple>
      <Divider/>
      <TouchableRipple onPress={on_press_grid_4}>
        <View style={{padding: 10, paddingVertical: 20}}>
          <View style={{flexDirection: "row"}}>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
          </View>
          <View style={{flexDirection: "row"}}>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
          </View>
          <View style={{flexDirection: "row"}}>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
          </View>
          <View style={{flexDirection: "row"}}>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
            <MaterialCommunityIcons name={"square"} color={colors.text}/>
          </View>
        </View>
      </TouchableRipple>
    </View>  
  );
}

export default GridMenu;
