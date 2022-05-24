import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ethers, utils } from "ethers";
import { ShareModalContext } from "../../../shareModal/createShareContext.js";
import LitJsSdk from "lit-js-sdk";
import LitReusableSelect from "../../../reusableComponents/litReusableSelect/LitReusableSelect";
import LitTokenSelect from "../../../reusableComponents/litTokenSelect/LitTokenSelect";
import LitFooter from "../../../reusableComponents/litFooter/LitFooter";
import LitInput from "../../../reusableComponents/litInput/LitInput";

const EthereumSelectGroup = ({ setSelectPage, handleUpdateAccessControlConditions }) => {
  const context = useContext(ShareModalContext);
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState({});
  const [contractAddress, setContractAddress] = useState("");
  const [subChain, setSubChain] = useState(null);
  const [contractType, setContractType] = useState("ERC721");
  const [erc1155TokenId, setErc1155TokenId] = useState("");
  const [erc1155TokenIdIsValid, setErc1155TokenIdIsValid] = useState(false);
  const [addressIsValid, setAddressIsValid] = useState(false);

  useEffect(
    () =>
      setSubChain({
        name: "Ethereum",
        id: "ethereum",
        value: "ethereum",
      }),
    []
  );

  const ethereumChainOptions = useMemo(
    () =>
      Object.keys(LitJsSdk.LIT_CHAINS).map((item) => {
        return {
          label: LitJsSdk.LIT_CHAINS[item].name,
          id: item,
          value: item,
        };
      }),
    []
  );

  useEffect(() => {
    const isValid = utils.isAddress(contractAddress);
    setAddressIsValid(isValid);
  }, [contractAddress])

  useEffect(() => {
    const isValid = utils.isAddress(erc1155TokenId);
    setErc1155TokenIdIsValid(isValid);
  }, [erc1155TokenId])

  const handleSubmit = async () => {

    if (contractAddress && contractAddress.length) {
      let accessControlConditions;
      if (contractType === "ERC20") {
        let decimals = 0;
        try {
          decimals = await LitJsSdk.decimalPlaces({
            chain: subChain.value,
            contractAddress: contractAddress,
          });
        } catch (e) {
          context.setError(e);
          console.log(e);
        }
        const amountInBaseUnit = ethers.utils.parseUnits(amount, decimals);
        accessControlConditions = [
          {
            contractAddress: contractAddress,
            standardContractType: contractType,
            chain: subChain.value,
            method: "balanceOf",
            parameters: [":userAddress"],
            returnValueTest: {
              comparator: ">=",
              value: amountInBaseUnit.toString(),
            },
          },
        ];
      } else if (contractType === "ERC721") {
        accessControlConditions = [
          {
            contractAddress: contractAddress,
            standardContractType: contractType,
            chain: subChain.value,
            method: "balanceOf",
            parameters: [":userAddress"],
            returnValueTest: {
              comparator: ">=",
              value: amount.toString(),
            },
          },
        ];
      } else if (contractType === "ERC1155") {
        accessControlConditions = [
          {
            contractAddress: contractAddress,
            standardContractType: contractType,
            chain: subChain.value,
            method: "balanceOf",
            parameters: [":userAddress", erc1155TokenId],
            returnValueTest: {
              comparator: ">=",
              value: amount.toString(),
            },
          },
        ];
      }
      handleUpdateAccessControlConditions(accessControlConditions);
    } else if (selectedToken && selectedToken.value === "ethereum") {
      // ethereum
      const amountInWei = ethers.utils.parseEther(amount);
      const accessControlConditions = [
        {
          contractAddress: "",
          standardContractType: "",
          chain: subChain.value,
          method: "eth_getBalance",
          parameters: [":userAddress", "latest"],
          returnValueTest: {
            comparator: ">=",
            value: amountInWei.toString(),
          },
        },
      ];
      handleUpdateAccessControlConditions(accessControlConditions);
    } else {

      let tokenType;
      if (selectedToken && selectedToken.standard?.toLowerCase() === "erc721") {
        tokenType = "erc721";
      } else if (selectedToken && selectedToken.decimals) {
        tokenType = "erc20";
      } else {
        // if we don't already know the type, try and get decimal places.  if we get back 0 or the request fails then it's probably erc721.
        let decimals = 0;
        try {
          decimals = await LitJsSdk.decimalPlaces({
            contractAddress: selectedToken.value,
          });
        } catch (e) {
          context.setError(e);
          console.log(e);
        }
        if (decimals == 0) {
          tokenType = "erc721";
        } else {
          tokenType = "erc20";
        }
      }

      if (tokenType == "erc721") {
        // erc721
        const accessControlConditions = [
          {
            contractAddress: selectedToken.value,
            standardContractType: "ERC721",
            chain: subChain.value,
            method: "balanceOf",
            parameters: [":userAddress"],
            returnValueTest: {
              comparator: ">=",
              value: amount.toString(),
            },
          },
        ];
        handleUpdateAccessControlConditions(accessControlConditions);
      } else {
        // erc20 token
        let amountInBaseUnit;
        if (selectedToken.decimals) {
          amountInBaseUnit = ethers.utils.parseUnits(
            amount,
            selectedToken.decimals
          );
        } else {
          // need to check the contract for decimals
          // this will auto switch the chain to the selected one in metamask
          let decimals = 0;
          try {
            decimals = await LitJsSdk.decimalPlaces({
              contractAddress: selectedToken.value,
            });
          } catch (e) {
            context.setError(e);
            console.log(e);
          }
          amountInBaseUnit = ethers.utils.parseUnits(amount, decimals);
        }
        const accessControlConditions = [
          {
            contractAddress: selectedToken.value,
            standardContractType: "ERC20",
            chain: subChain.value,
            method: "balanceOf",
            parameters: [":userAddress"],
            returnValueTest: {
              comparator: ">=",
              value: amountInBaseUnit.toString(),
            },
          },
        ];
        handleUpdateAccessControlConditions(accessControlConditions);
      }
    }


    if (context.flow === 'singleCondition') {
      context.setDisplayedPage('review');
    } else if (context.flow === 'multipleConditions') {
      context.setDisplayedPage('multiple');
    }
  };

  const handleChangeContractType = (value) => {
    setContractType(value);
  };

  // const createTokenSelectLabel = () => {
  //   if (selectedToken && selectedToken.label) {
  //     return (
  //       <span>
  //         {selectedToken.label}
  //         <button className={'lsm-border-none lsm-cursor-pointer'}>
  //           <img alt={'close'}
  //                className={'lsm-h-4'}
  //                src={union}
  //                onClick={() => setSelectedToken(null)}/>
  //         </button>
  //       </span>
  //     )
  //   } else {
  //     return 'Search for a token/NFT';
  //   }
  // }

  return (
    <div className={'lsm-condition-container'}>
      <h3 className={'lsm-condition-prompt-text'}>Which group
        should be able to access this asset?</h3>
      <h3 className={'lsm-condition-prompt-text'}>Select
        blockchain:</h3>
      <LitReusableSelect options={ethereumChainOptions}
                         label={'Select blockchain'}
                         option={subChain}
                         setOption={setSubChain}
      />
      <h3 className={'lsm-condition-prompt-text'}>Select
        token/NFT or enter contract address:</h3>
      {(!contractAddress.length) && (
        <LitTokenSelect option={selectedToken}
                        label={(!selectedToken || !selectedToken['label']) ? 'Search for a token/NFT' : selectedToken.label}
                        selectedToken={selectedToken}
                        setSelectedToken={setSelectedToken}
        />
      )}
      {((!selectedToken || !selectedToken['label']) && !contractAddress.length) && (
        <p
          className={'lsm-condition-prompt-text'}>OR</p>
      )}
      {(!selectedToken || !selectedToken['label']) && (
        <LitInput value={contractAddress}
                  setValue={setContractAddress}
                  errorMessage={addressIsValid ? null : 'Address is invalid'}
                  placeholder={'ERC20 or ERC721 or ERC1155 address'}
        />
      )}
      {(!!contractAddress.length) && (
        <div className={''}>
          <h3
            className={'lsm-condition-prompt-text'}>Token
            Contract Type:</h3>
          <span onChange={(e) => handleChangeContractType(e.target.value)}
                className={'lsm-radio-container'}>
            <div>
              <input readOnly checked={contractType === 'ERC20'} type="radio" id="erc20"
                     name="addressType"
                     value="ERC20"/>
              <label className={'lsm-radio-label'} htmlFor="erc20">ERC20</label>
            </div>

            <div>
              <input readOnly checked={contractType === 'ERC721'} type="radio" id="erc721" name="addressType"
                     value="ERC721"/>
              <label className={'lsm-radio-label'}
                     htmlFor="erc721">ERC721</label>
            </div>

            <div>
              <input readOnly checked={contractType === 'ERC1155'} type="radio" id="erc1155" name="addressType"
                     value="ERC1155"/>
              <label className={'lsm-radio-label'}
                     htmlFor="erc1155">ERC1155</label>
            </div>
          </span>
        </div>
      )}
      {(!!contractAddress.length && contractType === 'ERC1155') && (
        <LitInput value={erc1155TokenId} setValue={setErc1155TokenId}
                  errorMessage={erc1155TokenIdIsValid ? null : 'ERC1155 token id is invalid'}
                  placeholder={'ERC1155 Token Id'}
        />
      )}
      <h3 className={'lsm-condition-prompt-text'}>How many tokens
        does the wallet need to own?</h3>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={'##'}
             className={'lsm-input'}/>
      <LitFooter backAction={() => setSelectPage('chooseAccess')}
                 nextAction={handleSubmit}
                 nextDisableConditions={!amount ||
                 (!selectedToken && !addressIsValid) ||
                 !subChain.label || (contractType === 'ERC1155' && !erc1155TokenId.length)}/>
    </div>
  );
};

export default EthereumSelectGroup;
