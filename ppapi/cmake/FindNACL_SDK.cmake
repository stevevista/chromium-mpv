


set (_NACL_PEPPER_VER pepper_49)

find_path(NACL_SDK_DIR 
    ${_NACL_PEPPER_VER}/include/ppapi/cpp/core.h
    C:/nacl_sdk
    D:/nacl_sdk
    E:/nacl_sdk
    F:/nacl_sdk
    C:/dev/nacl_sdk
    D:/dev/nacl_sdk
    E:/dev/nacl_sdk
    F:/dev/nacl_sdk)

if (NACL_SDK_DIR)
  set (NACL_SDK_FOUND TRUE)
  set (NACL_PEPPER_VERSON ${_NACL_PEPPER_VER})
  set (NACL_PEPPER_INCLUDE_PATH "${NACL_SDK_DIR}/${_NACL_PEPPER_VER}/include")
  set (NACL_PEPPER_LIB_PATH "${NACL_SDK_DIR}/${_NACL_PEPPER_VER}/lib/win_x86_64_host/Release")
endif ()
