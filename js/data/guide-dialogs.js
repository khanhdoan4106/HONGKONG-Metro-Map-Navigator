// Biểu cảm và lời thoại mặc định của hai mascot.

export const guideMoods = {
  happy: { icon: ':D', label: 'Vui' },
  idea: { icon: '!!', label: 'Ý kiến' },
  pout: { icon: '-_-', label: 'Hờn dỗi' },
  angry: { icon: '>:(', label: 'Căng' },
  proud: { icon: 'B)', label: 'Tự tin' },
  excited: { icon: '**', label: 'Hào hứng' }
};

const sharedTips = [
  {
    left: 'Chọn xong điểm đi và điểm đến là tớ sẽ tranh luận với bạn tóc tím xem chỗ nào đáng xuống tàu.',
    right: 'Tranh luận thì được, nhưng tớ vẫn ưu tiên tuyến gọn và dễ đi hơn.',
    leftMood: 'excited',
    rightMood: 'proud'
  },
  {
    left: 'Nếu đi qua Mong Kok, Tsim Sha Tsui hoặc Central thì tớ sẽ đòi dừng chơi một lát.',
    right: 'Đừng ham chơi quá. Nếu đổi tuyến nhiều, tớ sẽ nhắc ngay.',
    leftMood: 'happy',
    rightMood: 'pout'
  },
  {
    left: 'Bấm vào hai đứa tớ để đổi lời thoại và xem biểu cảm mới.',
    right: 'Mỗi tuyến sẽ có nét mặt khác nhau: vui, hờn dỗi, căng hoặc hào hứng.',
    leftMood: 'idea',
    rightMood: 'happy'
  }
];

export const defaultGuideTips = {
  admin: [
    {
      left: 'Chào admin! Bấm vào đoạn metro để chặn tuyến khi có sự cố, hành khách sẽ thấy ngay.',
      right: 'Chặn xong nhớ bấm Xác nhận rồi thử tìm đường để kiểm tra tuyến thay thế nhé.',
      leftMood: 'happy',
      rightMood: 'idea'
    },
    ...sharedTips
  ],
  user: [
    {
      left: 'Tớ phụ trách tìm mấy điểm ăn chơi vui dọc tuyến. Chọn điểm đi trên bản đồ nhé.',
      right: 'Còn tớ canh thời gian và số lần đổi tuyến. Đoạn nào đang tạm dừng tớ sẽ tự đi vòng.',
      leftMood: 'happy',
      rightMood: 'idea'
    },
    ...sharedTips
  ]
};
