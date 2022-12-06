"use strict";
import { StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { IconButton } from 'react-native-paper';

const header = function({title, sub_title, left, right, on_press_back, is_modal, title_style, sub_title_style}) {

  return (
    <View>
      <View style={styles.header_component}>
        <View style={{flexDirection: 'row', flex:1}}>
          {(left || on_press_back) && (
            <View style={styles.left}>
              {on_press_back && (
                <IconButton icon={is_modal ? "close" : "chevron-left"} mode="contained" onPress={on_press_back}/>
              )}
              {left}
            </View>
          )}
        </View>
        <View style={{flex: 2, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={[styles.title, title_style]}>
              {title}
          </Text>
          {sub_title && (
            <View>
              <Text style={[styles.sub_title, sub_title_style]}>
                {sub_title}
            </Text>
            </View>
          )}
        </View>
        <View style={[{flex: 1}]}>
          {right && (
            <View style={styles.right}>
              {right}
            </View>
          )}
        </View>
      </View>
      <Divider/>
    </View>
  );
};

const styles = StyleSheet.create({
  header_component: {
    flexDirection: 'row',
    paddingBottom: 8,
    alignItems: 'center'
  },
  title: {
    fontWeight: "bold",
    fontSize: 16
  },
  sub_title: {
    fontWeight: "bold",
    fontSize: 14
  },
  right: {
    alignItems: "flex-end"
  }
});


export default header;