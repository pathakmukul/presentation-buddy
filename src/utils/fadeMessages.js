export const updateMessageOpacity = (container) => {
  if (!container) return;

  const messages = container.querySelectorAll('.message');
  const containerRect = container.getBoundingClientRect();
  const containerHeight = containerRect.height;

  // Gradient area is bottom 50%
  const gradientStart = containerHeight * 0.5;
  const gradientMid = containerHeight * 0.7; // Top 40% of gradient vs bottom 60%
  const topZone = containerHeight * 0.3; // Top 30%

  messages.forEach((message) => {
    const messageRect = message.getBoundingClientRect();
    const messageTop = messageRect.top - containerRect.top;
    const messageBottom = messageRect.bottom - containerRect.top;

    if (messageBottom < 0 || messageTop > containerHeight) {
      message.style.opacity = 0;
    } else if (messageTop >= gradientMid) {
      // BOTTOM 60% OF GRADIENT: 100% → 90%
      const progressInBottom = (messageTop - gradientMid) / (containerHeight - gradientMid);
      message.style.opacity = 1 - (progressInBottom * 0.1);
    } else if (messageTop >= gradientStart) {
      // TOP 40% OF GRADIENT (50-70%): 50% → 100%
      const progressInGradientTop = (messageTop - gradientStart) / (gradientMid - gradientStart);
      message.style.opacity = 0.5 + (progressInGradientTop * 0.5);
    } else if (messageTop <= topZone) {
      // TOP 30%: 0% → 5%
      const progressInTop = messageTop / topZone;
      message.style.opacity = progressInTop * 0.05;
    } else {
      // MIDDLE (30-50%): 5% → 20%
      const progressInMiddle = (messageTop - topZone) / (gradientStart - topZone);
      message.style.opacity = 0.05 + (progressInMiddle * 0.15);
    }
  });
};
