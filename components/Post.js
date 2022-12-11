"use strict";
import $ from "../setup";
import { Image, useWindowDimensions, View } from 'react-native';
import SwengleImage from "./SwengleImage";
import { useSnapshot } from "valtio";

const Post = function({row_id, navigation, rows_by_id}) {
  const {width} = useWindowDimensions();
  const row = useSnapshot(rows_by_id[row_id]);

  const height = row.post ? (width * (row.post.image_urls["1080"].height/row.post.image_urls["1080"].width)) : 0;
  
  return (
    <View style={{flexDirection: "row", alignItems: "center", paddingBottom: 8}}>
      <Image source={{uri: row.post.image_urls["1080"].url}} style={{width: width, height: height}}/>
    </View>
  );
};


export default Post;