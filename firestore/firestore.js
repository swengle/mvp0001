"use strict";
import _ from "underscore";
import { collection, doc, getDoc, increment, runTransaction, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { getHex } from "pastel-color";

const SIZE = 1080;
const WINDOW_SIZE = 390;
const MARGIN_RIGHT = 10;
const MARGIN_TOP = 10;
const CIRCLE_SIZE = 100;
const EMOJI_SIZE = 64;
const OPACITY = 0.4;

const circle_size = Math.round(SIZE * (CIRCLE_SIZE / WINDOW_SIZE));
const margin_circle_top = Math.round(SIZE * (MARGIN_TOP / WINDOW_SIZE));
const margin_circle_right = Math.round(SIZE * (MARGIN_RIGHT / WINDOW_SIZE));
const icon_size = Math.round(SIZE * (EMOJI_SIZE / WINDOW_SIZE));
const margin_icon_top = margin_circle_top + Math.round((circle_size - icon_size) / 2);
const margin_icon_right = margin_circle_right + Math.round((circle_size - icon_size) / 2);

let db;

const firestore = {
  set_db: function(_db) {
    db = _db;
  },
  invite_contact: async function(params) {
    const invited_doc_ref = doc(db, "invited", params.uid);
    const invited = {};
    _.each(params.phones, function(phone) {
      invited[phone] = Timestamp.now();
    });
    await setDoc(invited_doc_ref, invited, { merge: true });
  },
  create_messaging_config: async function(params) {
    const messaging_config_doc_ref = doc(db, "messaging_config", params.token);
    await setDoc(messaging_config_doc_ref, { uid: params.uid, token: params.token, created_at: Timestamp.now() });
  },
  update_messaging_config: async function(params) {
    const messaging_config_doc_ref = doc(db, "messaging_config", params.token);
    const update = params.settings;
    update.updated_at = Timestamp.now();
    await updateDoc(messaging_config_doc_ref, update);
  },
  is_username_available: async function(params) {
    const username_ref = doc(db, "username", params.username);
    const username_doc_snap = await getDoc(username_ref);
    return !username_doc_snap.exists();
  },
  update_user_account_privacy: async function(params) {
    const user_doc_ref = doc(db, "user", params.id);
    await updateDoc(user_doc_ref, { is_account_public: params.is_account_public });
  },
  update_user: async function(params) {
    const user_doc_ref = doc(db, "user", params.id);
    const user_doc_snap = await getDoc(user_doc_ref);
    if (!user_doc_snap.exists()) {
      throw new Error("User not found.");
    }
    const user = user_doc_snap.data();
    await runTransaction(db, async (transaction) => {
      let username, user_updates = {},
        username_doc_ref;
      if (params.username) {
        username_doc_ref = doc(db, "username", params.username.toLowerCase());
        const username_doc_snap = await transaction.get(username_doc_ref);
        if (username_doc_snap.exists()) {
          throw new Error("Username taken.");
        }
        username = {
          id: params.username.toLowerCase(),
          created_at: Timestamp.now(),
          uid: params.id
        };
        user_updates.username = params.username;
        user_updates.change_username_at = Timestamp.now();
        if (!user.profile_image_url || user.profile_image_url.indexOf("ui-avatars.com") !== -1) {
          user_updates.profile_image_url = "https://ui-avatars.com/api/?name=" + params.username + "&size=110&length=2&rounded=true&color=ffffff&background=" + getHex(params.username).replace("#", "");
        }
      }

      if (params.profile_image_url) {
        user_updates.profile_image_url = params.profile_image_url;
      }

      if (params.name) {
        user_updates.name = params.name;
      }
      if (params.bio) {
        user_updates.bio = params.bio;
      }

      if (_.size(username)) {
        transaction.set(username_doc_ref, username);
      }

      if (_.size(user_updates)) {
        transaction.update(user_doc_ref, user_updates);
      }
    });
  },
  update_relationship: async function(params) {
    const current_user_ref = doc(db, "user", params.uid);
    const user_ref = doc(db, "user", params.user.id);
    const relationship_doc_ref = doc(db, "relationship", params.uid + params.user.id);
    const other_relationship_ref = doc(db, "relationship", params.user.id + params.uid);
    await runTransaction(db, async (transaction) => {
      if (params.action === "approve" || params.action === "ignore") {
        const other_relationship_doc_snap = await transaction.get(other_relationship_ref);
        if (other_relationship_doc_snap.exists()) {
          const other_relationship = other_relationship_doc_snap.data();
          if (other_relationship.status === "request") {
            await transaction.set(relationship_doc_ref, {
              id: params.user.id,
              user_id: params.uid,
              updated_at: Timestamp.now(),
              status: params.action === "approve" ? "follow" : "ignore"
            });
            const current_user_update = { updated_at: Timestamp.now() };
            current_user_update.request_by_count = increment(-1);
            const user_update = { updated_at: Timestamp.now() };
            user_update.request_count = increment(-1);
            if (params.action === "approve") {
              current_user_update.follow_by_count  = increment(1);
              user_update.follow_count = increment(1);
            } else {
              current_user_update.ignore_count  = increment(1);
              user_update.ignore_by_count  = increment(1);
            }
            await transaction.update(current_user_ref, current_user_update);
            await transaction.update(user_ref, user_update);
          }
        }
        return;
      }

      const relationship_doc_snap = await transaction.get(relationship_doc_ref);
      let relationship;
      if (relationship_doc_snap.exists()) {
        relationship = relationship_doc_snap.data();
      }

      if (relationship && relationship.status === "block" && params.action !== "unblock") {
        return;
      }

      if (params.action === "follow") {
        if (!relationship || relationship.status === "none") {
          await transaction.set(relationship_doc_ref, {
            id: params.uid,
            user_id: params.user.id,
            updated_at: Timestamp.now(),
            status: params.user.is_account_public ? "follow" : "request"
          });
          const current_user_update = { updated_at: Timestamp.now() };
          if (params.user.is_account_public) {
            current_user_update.follow_count = increment(1);
          }
          else {
            current_user_update.request_count = increment(1);
          }
          await transaction.update(current_user_ref, current_user_update);
          const user_update = { updated_at: Timestamp.now() };
          if (params.user.is_account_public) {
            user_update.follow_by_count = increment(1);
          }
          else {
            user_update.request_by_count = increment(1);
          }
          await transaction.update(user_ref, user_update);
        }
      }
      else if (params.action === "unfollow") {
        if (relationship && (relationship.status === "follow" || relationship.status === "request" || relationship.status === "ignore")) {
          await transaction.set(relationship_doc_ref, {
            id: params.uid,
            user_id: params.user.id,
            updated_at: Timestamp.now(),
            status: "none"
          });
          const current_user_update = { updated_at: Timestamp.now() };
          const user_update = { updated_at: Timestamp.now() };
          if (relationship.status === "follow") {
            current_user_update.follow_count = increment(-1);
            user_update.follow_by_count = increment(-1);
          }
          else if (relationship.status === "request") {
            current_user_update.request_count = increment(-1);
            user_update.request_by_count = increment(-1);
          } else if (relationship.status === "ignore") {
            current_user_update.ignore_by_count = increment(-1);
            user_update.ignore_count = increment(-1);
          }
          await transaction.update(current_user_ref, current_user_update);
          await transaction.update(user_ref, user_update);
        }
      }
      else if (params.action === "block") {
        if (!relationship || (relationship.status !== "block")) {
          const other_relationship_ref = doc(db, "relationship", params.user.id + params.uid);
          await transaction.set(relationship_doc_ref, {
            id: params.uid,
            user_id: params.user.id,
            updated_at: Timestamp.now(),
            status: "block"
          });
          await transaction.set(other_relationship_ref, {
            id: params.user.id,
            user_id: params.uid,
            updated_at: Timestamp.now(),
            status: "none",
            is_blocked: true
          });
          const current_user_update = { updated_at: Timestamp.now() };
          current_user_update.block_count = increment(1);
          if (relationship) {
            if (relationship.status === "follow") {
              current_user_update.follow_count = increment(-1);
            } else if (relationship.status === "request") {
              current_user_update.request_count = increment(-1);
            }
          }
          await transaction.update(current_user_ref, current_user_update);
          const user_update = { updated_at: Timestamp.now() };
          if (relationship) {
            if (relationship.status === "follow") {
              user_update.follow_by_count = increment(-1);
            } else if (relationship.status === "request") {
              user_update.request_by_count = increment(-1);
            }
          }
          user_update.block_by_count = increment(1);
          await transaction.update(user_ref, user_update);
        }
      }
      else if (params.action === "unblock") {
        if (relationship && (relationship.status === "block")) {
          const other_relationship_ref = doc(db, "relationship", params.user.id + params.uid);
          await transaction.set(relationship_doc_ref, {
            id: params.uid,
            user_id: params.user.id,
            updated_at: Timestamp.now(),
            status: "none"
          });
          await transaction.set(other_relationship_ref, {
            id: params.user.id,
            user_id: params.uid,
            updated_at: Timestamp.now(),
            status: "none",
            is_blocked: false
          });
          const current_user_update = { updated_at: Timestamp.now() };
          current_user_update.block_count = increment(-1);
          await transaction.update(current_user_ref, current_user_update);
          const user_update = { updated_at: Timestamp.now() };
          user_update.block_by_count = increment(-1);
          await transaction.update(user_ref, user_update);
        }
      }
    });
  },
  save_post: async function(params) {
    const url_parts = params.image.url.split("/upload");
    const url = url_parts[0] + "/upload/c_scale,g_north_east,l_misc:circle_r39zfi.png,w_" + circle_size + ",h_" + circle_size + ",x_" + margin_circle_right + ",y_" + margin_circle_top + "/c_scale,g_north_east,l_emojis:" + params.emoji.id + ".png,w_" + icon_size + ",h_" + icon_size + ",x_" + margin_icon_right + ",y_" + margin_icon_top + url_parts[1];
    const now = Timestamp.now();
    const new_id = doc(collection(db, "post")).id;
    const new_post = {
      id: new_id,
      user_id: params.uid,
      created_at: now,
      updated_at: now,
      image: params.image,
      emoji: params.emoji,
      foo: {"1080": {url: url_parts[0] + "/upload/c_scale,g_north_east,l_misc:circle_r39zfi.png,w_" + circle_size + ",h_" + circle_size + ",x_" + margin_circle_right + ",y_" + margin_circle_top + "/c_scale,g_north_east,l_emojis:" + params.emoji.id + ".png,w_" + icon_size + ",h_" + icon_size + ",x_" + margin_icon_right + ",y_" + margin_icon_top + url_parts[1]}},
      image_urls: { "1080": { url: url, width: params.image.width, height: params.image.height } },
    };
    
    console.log(new_post);
    
    const new_post_ref = doc(db, "post", new_post.id);
    const current_user_ref = doc(db, "user", params.uid);
    await runTransaction(db, async (transaction) => {
      await transaction.set(new_post_ref, new_post);
      await transaction.update(current_user_ref, {
        post_count: increment(1),
        current_post_id: new_post.id
      });
    });
  }
};

export default firestore;
