
// services/ProfanityFilter.ts

// New extensive dictionary using placeholders.
const VIETNAMESE_PROFANITY_MAP: Record<string, string> = {
  "dương vật": "[male_genitalia_ph]",
  "âm vật": "[female_genitalia_external_ph]",
  "lồn": "[vagina_vulgar_ph]",
  "cặc": "[penis_vulgar_ph]",
  "địt": "[sexual_intercourse_vulgar_ph]",
  "buồi": "[penis_colloquial_vulgar_ph]",
  "chịch": "[sexual_intercourse_colloquial_ph]",
  "đụ": "[sexual_intercourse_alt_vulgar_ph]",
  "đĩ": "[prostitute_derogatory_ph]",
  "đĩ mẹ": "[motherf_insult_one_ph]",
  "địt mẹ": "[motherf_insult_two_ph]",
  "đụ mẹ": "[motherf_insult_three_ph]",
  "đm": "[dm_acronym_insult_ph]",
  "vcl": "[vcl_acronym_extreme_vulgar_ph]",
  "vkl": "[vkl_acronym_extreme_vulgar_alt_ph]",
  "đéo": "[no_emphatic_vulgar_ph]",
  "đách": "[no_emphatic_vulgar_alt_ph]",
  "con mẹ mày": "[your_mother_insult_ph]",
  "thằng cha mày": "[your_father_insult_ph]",
  "ngu": "[stupid_insult_ph]",
  "ngu như chó": "[stupid_as_dog_insult_ph]",
  "ngu như bò": "[stupid_as_cow_insult_ph]",
  "óc chó": "[dog_brain_insult_ph]",
  "khốn nạn": "[bastard_asshole_insult_ph]",
  "cứt": "[feces_vulgar_ph]",
  "cc": "[cc_acronym_feces_or_penis_ph]",
  "đái": "[urinate_vulgar_ph]",
  "ỉa": "[defecate_vulgar_ph]",
  "vú": "[breasts_colloquial_ph]",
  "bú vú": "[breast_suck_vulgar_ph]",
  "ngực": "[chest_breasts_neutral_to_colloquial_ph]",
  "mông": "[buttocks_colloquial_ph]",
  "đít": "[buttocks_alt_colloquial_ph]",
  "nứng": "[horny_aroused_vulgar_ph]",
  "dâm": "[lewd_lascivious_general_ph]",
  "cu": "[penis_childish_colloquial_ph]",
  "bướm": "[vagina_euphemism_butterfly_ph]",
  "chim": "[penis_euphemism_bird_ph]",
  "hiếp dâm": "[rape_crime_ph]",
  "ấu dâm": "[child_abuse_sexual_ph]",
  "thủ dâm": "[masturbation_act_ph]",
  "giao cấu": "[sexual_intercourse_formal_ph]",
  "quan hệ tình dục": "[sexual_relations_explicit_ph]",
  "làm tình": "[lovemaking_sexual_act_ph]",
  "đụ má": "[dm_alt_insult_two_ph]",
  "cờ hó": "[cho_dog_euphemism_for_insult_ph]",
  "súc vật": "[animal_beast_derogatory_ph]",
  "súc sinh": "[animal_beast_derogatory_alt_ph]",
  "điếm": "[prostitute_alt_derogatory_ph]",
  "đĩ thoã": "[slut_promiscuous_derogatory_ph]",
  "đĩ chó": "[dog_prostitute_insult_ph]",
  "đồ chó": "[you_dog_insult_ph]",
  "chó đẻ": "[dog_birth_insult_ph]",
  "thứ": "[thing_object_derogatory_prefix_ph]",
  "thằng": "[male_derogatory_prefix_ph]",
  "con": "[female_derogatory_prefix_ph]",
  "đồ": "[you_thing_prefix_insult_ph]",
  "mẹ kiếp": "[mother_life_expletive_ph]",
  "cha nội": "[internal_father_mild_expletive_ph]",
  "con đĩ dâm đãng": "[lewd_slut_insult_ph]",
  "nô lệ tình dục": "[sex_slave_term_ph]",
  "dâm dục": "[lewd_lustful_desire_ph]",
  "dâm ô": "[obscene_indecent_act_ph]",
  "dâm loạn": "[debauchery_promiscuity_ph]",
  "dâm tà": "[wicked_lewd_adjective_ph]",
  "khiêu dâm": "[erotic_pornographic_content_ph]",
  "truỵ lạc": "[depraved_debauched_state_ph]",
  "thông dâm": "[adultery_act_ph]",
  "âm đạo": "[vagina_anatomical_explicit_desc_ph]",
  "lỗ đít": "[anus_vulgar_one_ph]",
  "lỗ hậu": "[anus_vulgar_two_ph]",
  "lỗ nhị": "[anus_vulgar_three_ph]",
  "bím": "[vagina_slang_bim_ph]",
  "háng": "[groin_explicit_ph]",
  "liếm": "[licking_sexual_act_ph]",
  "mút": "[sucking_sexual_act_ph]",
  "rên rỉ": "[moaning_sexual_sound_ph]",
  "cực khoái": "[orgasm_sexual_climax_ph]",
  "lên đỉnh": "[climax_sexual_reaching_ph]",
  "tinh dịch": "[semen_sexual_fluid_ph]",
  "nước nôi": "[female_arousal_fluid_slang_ph]",
  "chảy nước": "[getting_wet_aroused_ph]",
  "phụt": "[ejaculate_vulgar_one_ph]",
  "bắn tinh": "[ejaculate_vulgar_two_ph]",
  "móc cua": "[fingering_vulgar_act_ph]",
  "chơi gay": "[gay_sex_act_explicit_ph]",
  "chơi les": "[lesbian_sex_act_explicit_ph]",
  "dâm đãng": "[lewd_lascivious_person_adj_explicit_ph]",
  "ướt át": "[wet_aroused_state_ph]",
  "thèm muốn": "[lustful_strong_sexual_desire_ph]",
  "thèm khát": "[craving_intense_sexual_desire_ph]",
  "khiêu gợi": "[provocative_suggestive_sexual_ph]",
  "gợi tình": "[erotic_arousing_sexual_ph]",
  "nhũ hoa": "[nipples_areola_detailed_ph]",
  "đầu vú": "[nipple_tip_detailed_ph]",
  "khe ngực": "[cleavage_detailed_ph]",
  "khe mông": "[butt_crack_detailed_ph]",
  "eo thon": "[slim_waist_sensual_ph]",
  "cặp giò": "[legs_sensual_pair_ph]",
  "da thịt": "[skin_flesh_sensual_context_ph]",
  "cơ thể nuột nà": "[smooth_sensual_body_ph]",
  "thân hình nóng bỏng": "[hot_sexy_body_figure_desc_ph]",
  "khuôn mặt dâm đãng": "[lewd_facial_expression_desc_ph]",
  "ánh mắt mời gọi": "[inviting_seductive_gaze_desc_ph]",
  "cử chỉ gợi dục": "[suggestive_sexual_gestures_desc_ph]",
  "đâm chọt": "[thrusting_penetration_vulgar_act_ph]",
  "thúc mạnh": "[forceful_thrusting_vulgar_act_ph]",
  "nhấp nhô": "[gentle_thrusting_teasing_act_ph]",
  "xoạc chân": "[legs_spread_sexual_vulgar_act_ph]",
  "banh háng": "[spreading_groin_vulgar_act_ph]",
  "banh lồn": "[spreading_vagina_vulgar_act_ph]",
  "sục cặc": "[jerking_penis_vulgar_act_ph]",
  "quay tay": "[handjob_masturbation_slang_act_ph]",
  "chơi some": "[group_sex_threesome_term_ph]",
  "chơi gangbang": "[gangbang_group_sex_term_ph]",
  "thổi kèn": "[blowjob_oral_sex_slang_ph]",
  "bú cu": "[penis_sucking_vulgar_slang_ph]",
  "liếm lồn": "[vagina_licking_vulgar_slang_ph]",
  "liếm đít": "[ass_licking_vulgar_slang_ph]",
  "đồ chơi tình dục": "[sex_toy_object_term_ph]",
  "dương vật giả": "[dildo_sex_toy_term_ph]",
  "máy rung": "[vibrator_sex_toy_term_ph]",
  "giao hợp": "[sexual_intercourse_formal_alt_ph]",
  "ân ái": "[intimate_lovemaking_act_ph]",
  "cưỡng dâm": "[rape_alt_crime_ph]",
  "quan hệ": "[relations_general_can_be_sexual_ph]",
  "mây mưa": "[clouds_rain_sex_euphemism_ph]",
  "đè": "[pressing_down_sexual_assault_context_ph]",
  "hãm hiếp": "[rape_violent_explicit_ph]",
  "làm chuyện ấy": "[do_that_thing_sex_euphemism_ph]",
  "ăn nằm": "[eat_sleep_live_together_sex_euphemism_ph]",
  "dục vọng": "[lustful_desire_strong_ph]",
  "nhục dục": "[carnal_desire_fleshly_ph]",
  "khoái cảm": "[sensual_pleasure_orgasm_alt_ph]",
  "thỏa mãn": "[sexual_satisfaction_fulfillment_ph]",
  "kích thích": "[arousal_stimulation_sexual_ph]",
  "sung sướng": "[extreme_pleasure_bliss_sexual_ph]",
  "ham muốn": "[desire_craving_sexual_general_ph]",
  "thèm thuồng": "[craving_drooling_intense_desire_ph]",
  "âm hộ": "[vulva_medical_formal_ph]",
  "cô bé": "[little_girl_vagina_euphemism_ph]",
  "cậu nhỏ": "[little_boy_penis_euphemism_ph]",
  "tinh trùng": "[sperm_male_gamete_ph]",
  "hột le": "[clitoris_vulgar_slang_ph]",
  "lông lồn": "[pubic_hair_vagina_vulgar_ph]",
  "lông cu": "[pubic_hair_penis_vulgar_ph]",
  "dái": "[testicles_vulgar_ph]",
  "hòn dái": "[testicles_pair_vulgar_ph]",
  "sướng": "[pleasure_good_feeling_sexual_context_ph]",
  "phê": "[high_euphoric_sexual_context_ph]",
  "đá lưỡi": "[french_kiss_tongue_action_ph]",
  "chổng mông": "[ass_up_doggy_style_vulgar_ph]",
  "nện": "[pounding_forceful_sex_vulgar_ph]",
  "quất": "[whipping_forceful_sex_vulgar_ph]",
  "dập": "[slamming_forceful_sex_vulgar_ph]",
  "dâm phụ": "[lewd_woman_adulteress_ph]",
  "dâm nam": "[lewd_man_promiscuous_ph]",
  "tà dâm": "[illicit_wicked_sexual_acts_ph]",
  "gian dâm": "[adultery_fornication_illicit_sex_ph]",
  "dâm nữ": "[lewd_female_nympho_ph]",
  "sextoy": "[sextoy_english_loanword_ph]",
  "trai bao": "[male_prostitute_gigolo_ph]",
  "gái bao": "[kept_woman_mistress_ph]",
  "gái gọi": "[call_girl_prostitute_ph]",
  "phò": "[prostitute_extremely_vulgar_ph]",
  "cave": "[prostitute_loanword_vulgar_ph]",
  "lầu xanh": "[brothel_green_house_euphemism_ph]",
  "nhà thổ": "[brothel_earth_house_direct_ph]",
  "kích dục": "[aphrodisiac_arousing_substance_ph]",
  "xuất tinh": "[ejaculation_formal_ph]",
  "trinh tiết": "[virginity_chastity_ph]",
  "mất trinh": "[losing_virginity_ph]",
  "còn trinh": "[still_virgin_ph]",
  "yêu râu xanh": "[pervert_blue_beard_child_molester_ph]",
  "biến thái": "[perverted_deviant_ph]",
  "loạn luân": "[incest_act_ph]",
  "thác loạn": "[debauchery_orgy_wild_party_ph]",
};

const REVERSE_PROFANITY_MAP: Record<string, string> = {};
for (const badWord in VIETNAMESE_PROFANITY_MAP) {
  const safeWord = VIETNAMESE_PROFANITY_MAP[badWord];
  REVERSE_PROFANITY_MAP[safeWord] = badWord;
}

// Helper function to escape special characters for regex
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Censors text by replacing defined profane words with safer alternatives.
 * Matching is case-insensitive and targets whole words.
 * @param text The input string to censor.
 * @returns The censored string.
 */
export function censorText(text: string): string {
  if (!text) return '';
  let censoredText = text;
  for (const badWord in VIETNAMESE_PROFANITY_MAP) {
    const safeWord = VIETNAMESE_PROFANITY_MAP[badWord];
    // Case-insensitive, global, whole word match
    const regex = new RegExp(`\\b${escapeRegExp(badWord)}\\b`, 'gi');
    censoredText = censoredText.replace(regex, safeWord);
  }
  return censoredText;
}

/**
 * De-censors text by replacing "safe alternatives" back to their original profane words.
 * Matching is case-insensitive and targets whole words.
 * @param text The input string to de-censor (typically AI response).
 * @returns The de-censored string.
 */
export function decensorText(text: string): string {
  if (!text) return '';
  let decensoredText = text;
  for (const safeWord in REVERSE_PROFANITY_MAP) {
    const originalBadWord = REVERSE_PROFANITY_MAP[safeWord];
    // Case-insensitive, global, whole word match
    // When de-censoring, the 'safeWord' (placeholder) might contain regex special characters like '[' or ']'.
    // These must be escaped when constructing the regex for matching.
    const regex = new RegExp(`\\b${escapeRegExp(safeWord)}\\b`, 'gi');
    decensoredText = decensoredText.replace(regex, originalBadWord);
  }
  return decensoredText;
}
