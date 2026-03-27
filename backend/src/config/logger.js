const formatMessage = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  if (!meta) {
    return `[${timestamp}] ${level.toUpperCase()} ${message}`;
  }

  return `[${timestamp}] ${level.toUpperCase()} ${message} ${JSON.stringify(meta)}`;
};

export const logger = {
  info(message, meta) {
    console.log(formatMessage("info", message, meta));
  },
  warn(message, meta) {
    console.warn(formatMessage("warn", message, meta));
  },
  error(message, meta) {
    console.error(formatMessage("error", message, meta));
  },
};
